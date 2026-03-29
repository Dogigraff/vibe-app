-- =============================================================================
-- VIBE V3 RLS Policies
-- Shadow ban, lifecycle, chat access per docs/DB_SCHEMA.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES: public read, owner update. Shadow ban does NOT hide profile.
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_owner"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_owner"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- USER_BLOCKS: user manages own blocks (insert own, select own, delete own)
-- -----------------------------------------------------------------------------
CREATE POLICY "user_blocks_select_own"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_insert_own"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_delete_own"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- -----------------------------------------------------------------------------
-- PARTIES: Map shows only status='active'. Shadow-banned host: visible ONLY to host.
-- Logic: (status=active AND host not shadow-banned) OR (viewer is host)
-- -----------------------------------------------------------------------------
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
        WHERE ub.blocker_id = auth.uid() AND ub.blocked_id = parties.host_id
      )
    )
    OR (host_id = auth.uid())
  );

CREATE POLICY "parties_insert_authenticated"
  ON public.parties FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "parties_update_host"
  ON public.parties FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- -----------------------------------------------------------------------------
-- PARTY_MEMBERS: Chat access only for members. Host adds on approve.
-- -----------------------------------------------------------------------------
CREATE POLICY "party_members_select_if_member"
  ON public.party_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.party_members pm2
      WHERE pm2.party_id = party_members.party_id AND pm2.user_id = auth.uid()
    )
  );

CREATE POLICY "party_members_insert_host_or_existing"
  ON public.party_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = party_id AND p.host_id = auth.uid()
    )
  );

CREATE POLICY "party_members_delete_host_kick"
  ON public.party_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = party_members.party_id AND p.host_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- -----------------------------------------------------------------------------
-- PARTY_REQUESTS: User sees own. Host sees incoming for their parties.
-- Shadow-banned requester: host does NOT see; only requester sees.
-- -----------------------------------------------------------------------------
CREATE POLICY "party_requests_select_own"
  ON public.party_requests FOR SELECT
  USING (user_id = auth.uid());

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
      WHERE ub.blocker_id = auth.uid() AND ub.blocked_id = party_requests.user_id
    )
  );

CREATE POLICY "party_requests_insert_own"
  ON public.party_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "party_requests_update_host"
  ON public.party_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = party_requests.party_id AND p.host_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- MESSAGES: Insert/Select only if user is party_member
-- -----------------------------------------------------------------------------
CREATE POLICY "messages_select_member"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = messages.party_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_member"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = messages.party_id AND pm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- REPORTS: User can insert (reporter). User can read own reports.
-- -----------------------------------------------------------------------------
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
