-- =============================================================================
-- V3 Patches: location type, symmetric block filtering, profile trigger
-- =============================================================================

-- 1. Schema: parties.location explicit geography(Point, 4326)
ALTER TABLE public.parties
ALTER COLUMN location TYPE geography(Point, 4326)
USING location;

-- 2. RLS: parties SELECT — symmetric block filtering
-- Exclude when (a) auth blocked host OR (b) host blocked auth
DROP POLICY IF EXISTS "parties_select_map_and_own" ON public.parties;
CREATE POLICY "parties_select_map_and_own"
  ON public.parties FOR SELECT
  USING (
    (
      status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = parties.host_id AND p.is_shadow_banned = true
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = parties.host_id)
           OR (ub.blocker_id = parties.host_id AND ub.blocked_id = auth.uid())
      )
    )
    OR (host_id = auth.uid())
  );

-- 3. RLS: party_requests host incoming SELECT — symmetric block filtering
-- Exclude when (a) host blocked requester OR (b) requester blocked host
DROP POLICY IF EXISTS "party_requests_select_host_incoming" ON public.party_requests;
CREATE POLICY "party_requests_select_host_incoming"
  ON public.party_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = party_requests.party_id AND p.host_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles prof
      WHERE prof.id = party_requests.user_id AND prof.is_shadow_banned = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = party_requests.user_id)
         OR (ub.blocker_id = party_requests.user_id AND ub.blocked_id = auth.uid())
    )
  );

-- 4. Trigger: handle_new_user with ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
