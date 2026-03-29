-- get_nearby_parties must remain SECURITY INVOKER (not DEFINER) so that RLS
-- policies on public.parties are enforced for the authenticated caller.
COMMENT ON FUNCTION public.get_nearby_parties(double precision, double precision, double precision, boolean, uuid)
IS 'Returns nearby active parties. Must remain SECURITY INVOKER to preserve RLS.';
