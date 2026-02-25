# Database Schema & Security Policies (V3 - Scalable)

## 1. Profiles (public.profiles)
- `id` (uuid, PK): Ref `auth.users`.
- `username` (text, unique).
- `avatar_url` (text).
- `bio` (text).
- `tags` (text[]).
- `reputation` (int): Default 10.
- `is_verified` (bool): Default false.
- `is_shadow_banned` (bool): Default false (Safety).
- `last_active_at` (timestamptz).
- `is_deleted` (bool): Default false (Soft delete).

## 2. User Blocks (public.user_blocks)
- `id` (uuid, PK).
- `blocker_id` (uuid).
- `blocked_id` (uuid).
- **Constraint:** Unique(blocker_id, blocked_id).

## 3. Parties (public.parties)
- `id` (uuid, PK).
- `host_id` (uuid).
- `location` (geography).
- `location_name` (text).
- `mood` (text).
- `description` (text).
- `max_guests` (int).
- `status` (text): 'active' | 'expired' | 'archived' | 'banned'.
- `is_boosted` (boolean): Default false.
- `expires_at` (timestamptz).
- `created_at` (timestamptz).

## 4. Party Members (public.party_members)
- `id` (uuid, PK).
- `party_id` (uuid).
- `user_id` (uuid).
- `role` (text): 'host' | 'guest'.
- `joined_at` (timestamptz).
- **Constraint:** Unique(party_id, user_id).

## 5. Party Requests (public.party_requests)
- `id` (uuid, PK).
- `party_id` (uuid).
- `user_id` (uuid).
- `status` (text): 'pending' | 'rejected'.
- `created_at` (timestamptz).

## 6. Messages (public.messages)
- `id` (uuid, PK).
- `party_id` (uuid).
- `user_id` (uuid).
- `content` (text).
- `created_at` (timestamptz).

## 7. Reports (public.reports)
- `id` (uuid, PK).
- `reporter_id` (uuid).
- `reported_id` (uuid). // Can be user_id or party_id
- `reason` (text).
- `status` (text): 'pending' | 'resolved'.

---

## Security (RLS) & Logic
1.  **Shadow Ban:** If `profiles.is_shadow_banned` is true, their Parties/Requests are visible ONLY to themselves.
2.  **Status Flow:** Queries for the map MUST filter `status = 'active'`.
3.  **Chat Access:** ONLY if `user_id` is in `party_members`.