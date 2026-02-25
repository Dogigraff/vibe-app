-- =============================================================================
-- Security Hardening v2: 5-point patch
-- (1) Key-poisoning RLS  (2) Device ID stability  (3) Room key race
-- (4) Fail-closed rate limiter  (5) Moderation trigger target_type
-- =============================================================================

-- ==================== (1) Key-poisoning: harden party_room_keys RLS ====================

-- Drop old permissive INSERT policy that only checked inserter membership
DROP POLICY IF EXISTS "members_insert_room_keys" ON public.party_room_keys;

-- New INSERT policy: inserter AND target user_id MUST both be party members
CREATE POLICY "members_insert_room_keys_v2" ON public.party_room_keys
  FOR INSERT WITH CHECK (
    -- The person inserting must be a member of this party
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_room_keys.party_id
        AND pm.user_id = auth.uid()
    )
    -- The target user_id must ALSO be a member of this party
    AND EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_room_keys.party_id
        AND pm.user_id = party_room_keys.user_id
    )
  );

-- Block UPDATE entirely: no UPDATE policy means RLS denies all updates.
-- Drop any existing UPDATE policy just in case.
DROP POLICY IF EXISTS "members_update_room_keys" ON public.party_room_keys;

-- ==================== (2) Device ID stability: add updated_at ====================

ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ==================== (3) Room key race: ensure_party_room_key RPC ====================

-- INSERT-only RPC: never overwrites an existing key (ON CONFLICT DO NOTHING).
-- This eliminates the race where two clients generate different keys.
CREATE OR REPLACE FUNCTION public.ensure_party_room_key(
  p_party_id                uuid,
  p_user_id                 uuid,
  p_encrypted_room_key      text,
  p_sender_device_id        uuid,
  p_sender_public_key_spki  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify caller is a party member
  IF NOT EXISTS (
    SELECT 1 FROM public.party_members
    WHERE party_id = p_party_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this party';
  END IF;

  -- Verify target user is a party member
  IF NOT EXISTS (
    SELECT 1 FROM public.party_members
    WHERE party_id = p_party_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this party';
  END IF;

  -- Insert-only: if a row already exists, do nothing (first writer wins)
  INSERT INTO public.party_room_keys (
    party_id, user_id, encrypted_room_key,
    sender_device_id, sender_public_key_spki
  ) VALUES (
    p_party_id, p_user_id, p_encrypted_room_key,
    p_sender_device_id, p_sender_public_key_spki
  )
  ON CONFLICT (party_id, user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_party_room_key IS
  'Insert-only room key distribution. First writer wins (ON CONFLICT DO NOTHING). Validates membership of both caller and target.';

-- ==================== (4) Harden allow_action: add search_path ====================

-- Recreate with explicit search_path (it already has it, but ensure pg_temp)
CREATE OR REPLACE FUNCTION public.allow_action(
  p_user_id     uuid,
  p_action      text,
  p_window_s    int DEFAULT 10,
  p_max_count   int DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bucket   timestamptz;
  v_count    int;
BEGIN
  v_bucket := to_timestamp(
    floor(extract(epoch from now()) / p_window_s) * p_window_s
  );

  INSERT INTO public.rate_limits (user_id, action, bucket, count)
  VALUES (p_user_id, p_action, v_bucket, 1)
  ON CONFLICT (user_id, action, bucket) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  DELETE FROM public.rate_limits
  WHERE bucket < now() - (p_window_s * 2) * interval '1 second'
    AND user_id = p_user_id
    AND action = p_action;

  RETURN v_count <= p_max_count;
END;
$$;

-- ==================== (5) Moderation trigger: target_type filter ====================

-- Rewrite check_shadow_ban to:
-- A) Skip non-user reports (party reports should NOT ban profiles)
-- B) Filter by target_type='user' in the count query
-- C) Use shadow_banned_until (time-boxed) instead of relying solely on is_shadow_banned
-- D) Set search_path for SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_shadow_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_unique_reporters int;
BEGIN
  -- Only process user-targeted reports; party reports do NOT trigger shadow bans
  IF NEW.target_type IS DISTINCT FROM 'user' THEN
    RETURN NEW;
  END IF;

  -- Count distinct reporters for THIS user in the last 24 hours
  SELECT COUNT(DISTINCT reporter_id) INTO v_unique_reporters
  FROM public.reports
  WHERE reported_id = NEW.reported_id
    AND target_type = 'user'
    AND status = 'pending'
    AND created_at > now() - interval '24 hours';

  -- Shadow ban for 24h if 5+ unique reporters
  IF v_unique_reporters >= 5 THEN
    UPDATE public.profiles
    SET
      shadow_banned_until = now() + interval '24 hours',
      shadow_ban_reason = 'Auto: ' || v_unique_reporters || ' unique reports in 24h',
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
      'Auto: ' || v_unique_reporters || ' unique reports in 24h window (target_type=user)'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create the trigger (function signature unchanged, just drop+create)
DROP TRIGGER IF EXISTS trg_check_shadow_ban ON public.reports;
CREATE TRIGGER trg_check_shadow_ban
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shadow_ban();

-- Fix shadow-ban RLS on messages: use shadow_banned_until > now() as primary check,
-- is_shadow_banned as fast-path boolean filter.
DROP POLICY IF EXISTS "members_read_messages_v2" ON public.messages;

CREATE POLICY "members_read_messages_v3" ON public.messages
  FOR SELECT USING (
    -- Must be a party member
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = messages.party_id
        AND pm.user_id = auth.uid()
    )
    AND (
      -- Message from non-shadow-banned user → visible to all
      NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = messages.user_id
          AND p.shadow_banned_until IS NOT NULL
          AND p.shadow_banned_until > now()
      )
      -- OR it's your own message → always visible
      OR messages.user_id = auth.uid()
    )
  );
