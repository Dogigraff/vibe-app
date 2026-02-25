# Snapshot Index: _review/last_v1

Flat copy of project files for manual inspection. Each file maps to its original path.

## Database / Migrations

| Filename | Original Path |
|----------|---------------|
| 20260213052612_v3_schema_db_schema_md.sql | supabase/migrations/20260213052612_v3_schema_db_schema_md.sql |
| 20260213052619_v3_rls_policies.sql | supabase/migrations/20260213052619_v3_rls_policies.sql |
| 20260213052625_v3_profiles_trigger_on_auth_signup.sql | supabase/migrations/20260213052625_v3_profiles_trigger_on_auth_signup.sql |
| 20260213120000_v3_rls_and_schema_patches.sql | supabase/migrations/20260213120000_v3_rls_and_schema_patches.sql |

## Supabase Clients

| Filename | Original Path |
|----------|---------------|
| server.ts | lib/supabase/server.ts |
| client.ts | lib/supabase/client.ts |
| supabase_middleware.ts | lib/supabase/middleware.ts |

## Middleware

| Filename | Original Path |
|----------|---------------|
| middleware.ts | middleware.ts (project root) |

## API Routes

| Filename | Original Path |
|----------|---------------|
| route.ts | app/api/auth/telegram/route.ts |
| route_profile_sync.ts | app/api/profile/sync/route.ts |

## App Pages

| Filename | Original Path |
|----------|---------------|
| page.tsx | app/page.tsx |
| page_login.tsx | app/(public)/login/page.tsx |
| page_map.tsx | app/(root)/map/page.tsx |

## Telegram Integration

| Filename | Original Path |
|----------|---------------|
| telegram.ts | lib/telegram.ts |
| telegram_types.ts | types/telegram.ts |

## Types

| Filename | Original Path |
|----------|---------------|
| supabase.ts | types/supabase.ts |
| db.ts | types/db.ts |

## Components (imported locally)

| Filename | Original Path |
|----------|---------------|
| landing-or-login.tsx | components/landing-or-login.tsx |
| profile-keep-alive.tsx | components/profile-keep-alive.tsx |
| button.tsx | components/ui/button.tsx |

## Lib

| Filename | Original Path |
|----------|---------------|
| utils.ts | lib/utils.ts |

## Config

| Filename | Original Path |
|----------|---------------|
| package.json | package.json |

---

**Note:** Filenames that differ from the original (e.g. `route_profile_sync.ts`, `page_login.tsx`, `telegram_types.ts`, `supabase_middleware.ts`) were disambiguated to avoid overwrites in the flat structure.
