-- Fix Supabase Security Warning: Table publicly accessible (rls_disabled_in_public)
-- This happens automatically when the PostGIS extension is enabled, as it creates lengthily the `spatial_ref_sys` table in the public schema without RLS.

ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spatial_ref_sys' 
        AND policyname = 'Allow read access to spatial_ref_sys'
    ) THEN
        CREATE POLICY "Allow read access to spatial_ref_sys" 
        ON public.spatial_ref_sys 
        FOR SELECT 
        USING (true);
    END IF;
END
$$;
