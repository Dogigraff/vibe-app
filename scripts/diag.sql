-- Step 1 diagnostics for production Supabase
SELECT current_database(), current_schema(), version();
SELECT nspname FROM pg_namespace WHERE nspname IN ('public','supabase_migrations','auth','extensions','realtime','storage');
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%migration%' ORDER BY 1, 2;
SELECT n.nspname AS schema, p.proname, p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'allow_action';
