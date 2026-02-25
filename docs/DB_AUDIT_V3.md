# DB Audit V3

## 1. Table Definitions (DDL)

### 1.1 profiles

```sql
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
```

### 1.2 parties

```sql
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
```

---

## 2. RLS Policies

### 2.1 parties — SELECT

```sql
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
```

### 2.2 party_requests — SELECT

```sql
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
```

### 2.3 messages — SELECT / INSERT

```sql
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
```

---

## 3. Triggers

### 3.1 Profile auto-create on signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
