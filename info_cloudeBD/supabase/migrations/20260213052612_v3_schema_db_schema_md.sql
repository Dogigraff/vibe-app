-- =============================================================================
-- VIBE App V3 Schema Migration
-- Source: docs/DB_SCHEMA.md (V3 - Scalable)
-- =============================================================================

-- Step 1: Drop old functions that reference deprecated tables
DROP FUNCTION IF EXISTS public.get_nearby_beacons(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.create_beacon_with_location(uuid, text, text, jsonb, timestamptz);

-- Step 2: Drop old tables (reverse dependency order)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.party_members CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.interactions CASCADE;
DROP TABLE IF EXISTS public.beacons CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.party_requests CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;
DROP TABLE IF EXISTS public.user_blocks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- Step 3: Create V3 tables
-- =============================================================================

-- 1. Profiles (ref auth.users)
-- Shadow ban: is_shadow_banned = true means user's Parties/Requests visible ONLY to themselves
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  bio text,
  tags text[],
  reputation int NOT NULL DEFAULT 10,
  is_verified bool NOT NULL DEFAULT false,
  is_shadow_banned bool NOT NULL DEFAULT false,
  last_active_at timestamptz,
  is_deleted bool NOT NULL DEFAULT false
);

COMMENT ON TABLE public.profiles IS 'User profiles. is_shadow_banned: when true, their Parties and Requests are visible ONLY to themselves.';
COMMENT ON COLUMN public.profiles.reputation IS 'Base 10. +1 meetup, +5 host>2 guests, -5 report, -2 no-show.';
COMMENT ON COLUMN public.profiles.is_deleted IS 'Soft delete flag.';

-- 2. User Blocks (blocker blocks blocked)
-- Enforced via RLS: block filtering applied when querying parties, requests, messages
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

COMMENT ON TABLE public.user_blocks IS 'Block relationships. Used to filter blocked users from queries (parties, requests, chat).';
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- 3. Parties (replaces beacons)
-- Lifecycle: active -> expired (timer) -> archived (24h later). Map shows ONLY status='active'.
CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location geography NOT NULL,
  location_name text,
  mood text,
  description text,
  max_guests int NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'archived', 'banned')),
  is_boosted bool NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parties IS 'Vibes/Parties. Lifecycle: active -> expired (timer=0) -> archived (24h later). Map MUST filter status=active.';
COMMENT ON COLUMN public.parties.status IS 'active=on map, expired=chat read-only, archived=hidden, banned=removed.';
CREATE INDEX idx_parties_location_gist ON public.parties USING GIST(location);
CREATE INDEX idx_parties_status ON public.parties(status);
CREATE INDEX idx_parties_expires_at ON public.parties(expires_at);
CREATE INDEX idx_parties_host_status ON public.parties(host_id, status);

-- 4. Party Members (host + guests)
-- Chat access: user can read/write messages ONLY if in party_members for that party
CREATE TABLE public.party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('host', 'guest')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

COMMENT ON TABLE public.party_members IS 'Chat access: only members can see/send messages for a party.';
CREATE INDEX idx_party_members_party ON public.party_members(party_id);
CREATE INDEX idx_party_members_user ON public.party_members(user_id);

-- 5. Party Requests (Knock-Knock)
-- User sees own; host sees incoming for their parties. Shadow-banned requester: only they see it.
CREATE TABLE public.party_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.party_requests IS 'Knock requests. User sees own; host sees incoming. Shadow-banned: visible only to requester.';
CREATE INDEX idx_party_requests_party_status ON public.party_requests(party_id, status);
CREATE INDEX idx_party_requests_user ON public.party_requests(user_id);

-- 6. Messages (Chat)
-- Insert/Select only if user is in party_members for that party_id
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.messages IS 'Chat. Access only for party_members.';
CREATE INDEX idx_messages_party_created ON public.messages(party_id, created_at);

-- 7. Reports (reported_id can be user or party)
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL,
  reason text,
  status text NOT NULL CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending'
);

COMMENT ON TABLE public.reports IS 'Reports. reported_id can reference user_id or party_id (polymorphic).';
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- =============================================================================
-- Step 4: Enable RLS on all tables
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
