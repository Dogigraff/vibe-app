-- =============================================================================
-- Reports & Moderation Hardening
-- =============================================================================

-- 1. Extend profiles with proper shadow-ban model
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shadow_banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS shadow_ban_reason text,
  ADD COLUMN IF NOT EXISTS shadow_ban_created_at timestamptz;

COMMENT ON COLUMN public.profiles.shadow_banned_until IS 'If set and > now(), user is shadow-banned until this time.';
COMMENT ON COLUMN public.profiles.shadow_ban_reason IS 'Auto-generated or moderator-set reason for shadow ban.';

-- 2. Moderation events audit log
CREATE TABLE IF NOT EXISTS public.moderation_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid,                        -- NULL = system/auto
  target_id  uuid NOT NULL,               -- user or party being moderated
  action     text NOT NULL,               -- 'shadow_ban', 'unshadow_ban', 'warn', etc.
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.moderation_events IS 'Audit trail for all moderation actions (auto and manual).';

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mod_events_target ON public.moderation_events(target_id);
CREATE INDEX IF NOT EXISTS idx_mod_events_created ON public.moderation_events(created_at);

-- No public read of moderation events (admin-only, via service key)

-- 3. Improve reports table
-- Add target_type, created_at, unique constraint on (reporter, target_type, reported)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Add CHECK constraint for target_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_target_type_check'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('user', 'party'));
  END IF;
END $$;

-- Add unique constraint (reporter + target_type + reported) to prevent duplicate reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_unique_per_target'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_unique_per_target UNIQUE (reporter_id, target_type, reported_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at);

-- 4. Rewrite shadow-ban trigger: count DISTINCT reporters in 24h window, threshold 5
CREATE OR REPLACE FUNCTION public.check_shadow_ban()
RETURNS trigger AS $$
DECLARE
  v_unique_reporters int;
BEGIN
  -- Count distinct reporters in the last 24 hours for this target
  SELECT COUNT(DISTINCT reporter_id) INTO v_unique_reporters
  FROM public.reports
  WHERE reported_id = NEW.reported_id
    AND status = 'pending'
    AND created_at > now() - interval '24 hours';

  -- Shadow ban for 24h if 5+ unique reporters
  IF v_unique_reporters >= 5 THEN
    UPDATE public.profiles
    SET
      shadow_banned_until = now() + interval '24 hours',
      shadow_ban_reason = 'Auto: 5+ unique reports in 24h',
      shadow_ban_created_at = now(),
      is_shadow_banned = true
    WHERE id = NEW.reported_id::uuid
      AND (shadow_banned_until IS NULL OR shadow_banned_until < now());

    -- Audit log
    INSERT INTO public.moderation_events (actor_id, target_id, action, reason)
    VALUES (
      NULL,
      NEW.reported_id::uuid,
      'shadow_ban',
      'Auto: ' || v_unique_reporters || ' unique reports in 24h window'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_shadow_ban ON public.reports;
CREATE TRIGGER trg_check_shadow_ban
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shadow_ban();

-- 5. Shadow-ban visibility for messages:
-- Shadow-banned user's messages are visible ONLY to themselves.
-- We achieve this by replacing the simple SELECT RLS with one that checks shadow-ban status.

-- Drop old policy if exists (from previous migration)
DROP POLICY IF EXISTS "members_read_messages" ON public.messages;

-- New policy: members can read messages, BUT shadow-banned users' messages are only visible to themselves
CREATE POLICY "members_read_messages_v2" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = messages.party_id
        AND pm.user_id = auth.uid()
    )
    AND (
      -- Message is from a non-shadow-banned user → visible to all members
      NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = messages.user_id
          AND p.is_shadow_banned = true
          AND (p.shadow_banned_until IS NULL OR p.shadow_banned_until > now())
      )
      -- OR the message is from the current user (shadow-banned users see their own messages)
      OR messages.user_id = auth.uid()
    )
  );

-- 6. Shadow-ban aware INSERT: shadow-banned users CAN still insert messages
-- (they won't know they're banned — messages silently invisible to others)
-- The existing INSERT policy already works correctly for this.
