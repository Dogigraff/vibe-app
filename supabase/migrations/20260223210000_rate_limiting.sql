-- =============================================================================
-- Atomic Postgres Rate Limiting
-- =============================================================================

-- Rate limit buckets: atomic counter per (user, action, bucket window)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id  uuid    NOT NULL,
  action   text    NOT NULL,
  bucket   timestamptz NOT NULL,
  count    int     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, bucket)
);

COMMENT ON TABLE public.rate_limits IS
  'Atomic rate limiting. Rows auto-expire. Bucket = truncated to window boundary.';

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket
  ON public.rate_limits(bucket);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies: rate_limits is accessed only via SECURITY DEFINER function.

-- allow_action: returns TRUE if the action is allowed, FALSE if rate-limited.
-- Atomic: uses INSERT ... ON CONFLICT to increment count.
-- Bucket key = floor(epoch / window) * window  → deterministic window boundary.
CREATE OR REPLACE FUNCTION public.allow_action(
  p_user_id     uuid,
  p_action      text,
  p_window_s    int DEFAULT 10,
  p_max_count   int DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket   timestamptz;
  v_count    int;
BEGIN
  -- Compute deterministic bucket start
  v_bucket := to_timestamp(
    floor(extract(epoch from now()) / p_window_s) * p_window_s
  );

  -- Atomic upsert: try to insert with count=1, or increment existing
  INSERT INTO public.rate_limits (user_id, action, bucket, count)
  VALUES (p_user_id, p_action, v_bucket, 1)
  ON CONFLICT (user_id, action, bucket) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Opportunistic cleanup: delete rows older than 2 windows (cheap, no lock contention)
  DELETE FROM public.rate_limits
  WHERE bucket < now() - (p_window_s * 2) * interval '1 second'
    AND user_id = p_user_id
    AND action = p_action;

  RETURN v_count <= p_max_count;
END;
$$;

COMMENT ON FUNCTION public.allow_action IS
  'Atomic rate limiter. Returns TRUE if action is within limit. Cleans expired buckets opportunistically.';
