-- Must remain SECURITY INVOKER to preserve RLS on public.parties.
CREATE OR REPLACE FUNCTION public.get_nearby_parties(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_filter_my boolean DEFAULT false,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  host_id uuid,
  mood text,
  description text,
  location_name text,
  expires_at timestamptz,
  is_boosted boolean,
  lat double precision,
  lng double precision
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.host_id,
    p.mood,
    p.description,
    p.location_name,
    p.expires_at,
    p.is_boosted,
    ST_Y(p.location::geometry) AS lat,
    ST_X(p.location::geometry) AS lng
  FROM public.parties p
  WHERE p.status = 'active'
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    AND (NOT p_filter_my OR p.host_id = p_user_id)
  ORDER BY p.is_boosted DESC, p.expires_at ASC, p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_parties(double precision, double precision, double precision, boolean, uuid) TO authenticated;
