-- create_party: insert party with geography from lat/lng
-- SECURITY INVOKER to enforce RLS (profiles_insert_owner etc.)
CREATE OR REPLACE FUNCTION public.create_party(
  p_lat double precision,
  p_lng double precision,
  p_mood text,
  p_description text,
  p_location_name text DEFAULT '',
  p_expires_in_hours int DEFAULT 2
)
RETURNS TABLE (
  id uuid,
  host_id uuid,
  mood text,
  description text,
  location_name text,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid;
  v_party_id uuid;
  v_expires_at timestamptz;
BEGIN
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_expires_at := now() + (p_expires_in_hours || ' hours')::interval;

  INSERT INTO public.parties (
    host_id,
    location,
    location_name,
    mood,
    description,
    max_guests,
    status,
    is_boosted,
    expires_at
  )
  VALUES (
    v_host_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    NULLIF(trim(p_location_name), ''),
    p_mood,
    p_description,
    10,
    'active',
    false,
    v_expires_at
  )
  RETURNING parties.id INTO v_party_id;

  RETURN QUERY
  SELECT
    p.id,
    p.host_id,
    p.mood,
    p.description,
    p.location_name,
    p.status,
    p.expires_at
  FROM public.parties p
  WHERE p.id = v_party_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_party(double precision, double precision, text, text, text, int) TO authenticated;
