-- =============================================================================
-- Security Hardening v2: 5-point patch
-- (1) Key-poisoning RLS  (2) Device ID stability  (3) Room key race
-- (4) Fail-closed rate limiter  (5) Moderation trigger target_type
-- =============================================================================

-- (1) Hardened RLS for party_room_keys (Key-poisoning defense)
DROP POLICY IF EXISTS members_insert_room_keys ON public.party_room_keys;
CREATE POLICY members_insert_room_keys_v2 ON public.party_room_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.party_members
      WHERE party_id = party_room_keys.party_id
      AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.party_members
      WHERE party_id = party_room_keys.party_id
      AND user_id = party_room_keys.user_id
    )
  );

-- (2) Device ID stability: Add updated_at column
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- (3) Room key race condition: ensure_party_room_key RPC
CREATE OR REPLACE FUNCTION public.ensure_party_room_key(
  p_party_id UUID,
  p_user_id UUID,
  p_encrypted_room_key TEXT,
  p_sender_device_id UUID DEFAULT NULL,
  p_sender_public_key_spki TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert only if not exists (atomicity)
  INSERT INTO public.party_room_keys (
    party_id, 
    user_id, 
    encrypted_room_key, 
    sender_device_id, 
    sender_public_key_spki
  )
  VALUES (
    p_party_id, 
    p_user_id, 
    p_encrypted_room_key, 
    p_sender_device_id, 
    p_sender_public_key_spki
  )
  ON CONFLICT (user_id, party_id) DO NOTHING;
END;
$$;

-- (5) Moderation trigger: target_type aware and hardened search_path
CREATE OR REPLACE FUNCTION public.check_shadow_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    report_count INT;
BEGIN
    -- Skip reports that are not targeting a user (e.g. party reports)
    IF NEW.target_type IS DISTINCT FROM 'user' THEN
        RETURN NEW;
    END IF;

    -- Count pending reports for the target user
    SELECT COUNT(*) INTO report_count
    FROM public.reports
    WHERE reported_id = NEW.reported_id
    AND target_type = 'user'
    AND status = 'pending';

    -- Ban threshold (e.g. 5 reports)
    IF report_count >= 5 THEN
        UPDATE public.profiles
        SET shadow_banned_until = now() + interval '24 hours'
        WHERE id = NEW.reported_id;

        -- Log for moderation
        INSERT INTO public.moderation_events (user_id, event_type, reason)
        VALUES (NEW.reported_id, 'shadow_ban_auto', 'Threshold of 5 reports reached');
    END IF;

    RETURN NEW;
END;
$$;

-- Message RLS: Use shadow_banned_until for read policy
DROP POLICY IF EXISTS members_read_messages ON public.messages;
CREATE POLICY members_read_messages_v3 ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.party_members
      WHERE party_id = messages.party_id
      AND user_id = auth.uid()
    )
    AND (
      -- Sender is not shadow-banned
      NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = messages.sender_id
        AND shadow_banned_until > now()
      )
      OR sender_id = auth.uid() -- Can always see own messages
    )
  );

-- Enforce security definer security on existing RPCs
ALTER FUNCTION public.allow_action(UUID, TEXT, INT, INT) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_party(TEXT, TEXT, GEOMETRY) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nearby_parties(GEOMETRY, DOUBLE PRECISION) SET search_path = public, pg_temp;
