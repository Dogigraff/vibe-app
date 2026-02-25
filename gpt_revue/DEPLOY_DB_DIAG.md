# Step 1: Production DB Diagnostics (pre-migration)

**Date:** 2026-02-25  
**Project ref:** modicqcpmtrzptyhysga

## 1. Database info

```sql
SELECT current_database(), current_schema(), version();
```

| current_database | current_schema | version |
|------------------|----------------|---------|
| postgres | public | PostgreSQL 17.6 on aarch64-unknown-linux-gnu |

## 2. Schemas

```sql
SELECT nspname FROM pg_namespace WHERE nspname IN ('public','supabase_migrations','auth','extensions','realtime','storage');
```

**Result:** auth, extensions, public, realtime, storage

**⚠️ supabase_migrations schema — NOT PRESENT** (migrations never applied via Supabase CLI)

## 3. Migration tables

```sql
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%migration%';
```

| table_schema | table_name |
|--------------|------------|
| auth | schema_migrations |
| realtime | schema_migrations |
| storage | migrations |

**⚠️ supabase_migrations.schema_migrations — NOT PRESENT**

## 4. allow_action function

```sql
SELECT n.nspname, p.proname, p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='allow_action';
```

**Result:** [] (empty) — **function does NOT exist**

## Conclusion (pre-migration)

- Supabase CLI migrations have never been applied
- `allow_action` RPC missing
- Need: `supabase link` + `supabase db push`

---

## Post-migration state (2026-02-25)

После ручного применения миграций через MCP `execute_sql`:

- **supabase_migrations** — схема создана, `schema_migrations` заполнена
- **allow_action** — `allow_action(uuid,text,integer,integer)` — существует
- **public** — таблицы: messages, moderation_events, parties, party_members, party_requests, party_room_keys, profiles, rate_limits, reports, user_blocks, user_devices
