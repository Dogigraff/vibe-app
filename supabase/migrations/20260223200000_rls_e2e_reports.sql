-- =============================================================================
-- VIBE App: Additional RLS + Rate Limit + E2E Support Migration
-- =============================================================================

-- 1. Add public_key to profiles for E2E encryption
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_key text;

COMMENT ON COLUMN public.profiles.public_key IS 'Base64-encoded public key for E2E encryption in party chats.';

-- 2. Create party_room_keys table for E2E encrypted room keys
CREATE TABLE IF NOT EXISTS public.party_room_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_room_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

COMMENT ON TABLE public.party_room_keys IS 'Stores per-user encrypted room keys for E2E party chats. Each user gets the room key encrypted with their public key.';

ALTER TABLE public.party_room_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_party_room_keys_party ON public.party_room_keys(party_id);
CREATE INDEX IF NOT EXISTS idx_party_room_keys_user ON public.party_room_keys(user_id);

-- 3. RLS for party_room_keys: users can only read their own encrypted keys
CREATE POLICY "users_read_own_room_keys" ON public.party_room_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "members_insert_room_keys" ON public.party_room_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_room_keys.party_id
        AND pm.user_id = auth.uid()
    )
  );

-- 4. Ensure messages RLS policies exist
-- Read: only party members can read messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_read_messages' AND tablename = 'messages') THEN
    CREATE POLICY "members_read_messages" ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id = messages.party_id
            AND pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Write: only party members can insert messages (their own)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_insert_messages' AND tablename = 'messages') THEN
    CREATE POLICY "members_insert_messages" ON public.messages
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id = messages.party_id
            AND pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. Ensure reports RLS policies exist
-- Users can insert reports (as reporter)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_insert_reports' AND tablename = 'reports') THEN
    CREATE POLICY "users_insert_reports" ON public.reports
      FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;

-- Users can read their own reports
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_reports' AND tablename = 'reports') THEN
    CREATE POLICY "users_read_own_reports" ON public.reports
      FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
END $$;

-- 6. Ensure party_requests RLS policies exist
-- Users can insert their own requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_insert_requests' AND tablename = 'party_requests') THEN
    CREATE POLICY "users_insert_requests" ON public.party_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can read their own requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_requests' AND tablename = 'party_requests') THEN
    CREATE POLICY "users_read_own_requests" ON public.party_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Hosts can read requests for their parties
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hosts_read_party_requests' AND tablename = 'party_requests') THEN
    CREATE POLICY "hosts_read_party_requests" ON public.party_requests
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.parties p
          WHERE p.id = party_requests.party_id
            AND p.host_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. Read profiles: public for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "authenticated_read_profiles" ON public.profiles
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Users can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_update_own_profile' AND tablename = 'profiles') THEN
    CREATE POLICY "users_update_own_profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- 8. Auto-shadow-ban trigger: if a user gets >= 5 pending reports, shadow ban them
CREATE OR REPLACE FUNCTION public.check_shadow_ban()
RETURNS trigger AS $$
DECLARE
  report_count int;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.reports
  WHERE reported_id = NEW.reported_id
    AND status = 'pending';

  IF report_count >= 5 THEN
    UPDATE public.profiles
    SET is_shadow_banned = true
    WHERE id = NEW.reported_id::uuid
      AND is_shadow_banned = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_shadow_ban ON public.reports;
CREATE TRIGGER trg_check_shadow_ban
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shadow_ban();
