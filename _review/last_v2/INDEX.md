# Review Snapshot last_v2 — File Mapping

Flat copies for manual inspection. Each row maps copied filename → original path.

## DB / Migrations

| Copied File | Original Path |
|-------------|---------------|
| `20260213070000_add_get_nearby_parties_function.sql` | `supabase/migrations/20260213070000_add_get_nearby_parties_function.sql` |
| `20260213130000_add_get_nearby_parties_invoker_comment.sql` | `supabase/migrations/20260213130000_add_get_nearby_parties_invoker_comment.sql` |
| `20260213120000_v3_rls_and_schema_patches.sql` | `supabase/migrations/20260213120000_v3_rls_and_schema_patches.sql` |

## API / Auth / Profile

| Copied File | Original Path |
|-------------|---------------|
| `auth_telegram_route.ts` | `app/api/auth/telegram/route.ts` |
| `profile_sync_route.ts` | `app/api/profile/sync/route.ts` |
| `parties_nearby_route.ts` | `app/api/parties/nearby/route.ts` |

## Map

| Copied File | Original Path |
|-------------|---------------|
| `map_page.tsx` | `app/(root)/map/page.tsx` |
| `VibeMap.tsx` | `features/map/VibeMap.tsx` |

## Supabase Helpers / Types

| Copied File | Original Path |
|-------------|---------------|
| `server.ts` | `lib/supabase/server.ts` |
| `client.ts` | `lib/supabase/client.ts` |
| `middleware.ts` | `lib/supabase/middleware.ts` |
| `supabase.ts` | `types/supabase.ts` |
| `db.ts` | `types/db.ts` |

## Telegram Helpers

| Copied File | Original Path |
|-------------|---------------|
| `lib_telegram.ts` | `lib/telegram.ts` |
| `types_telegram.ts` | `types/telegram.ts` |

## Config

| Copied File | Original Path |
|-------------|---------------|
| `package.json` | `package.json` |
| `tsconfig.json` | `tsconfig.json` |
| `.env.example` | `.env.example` |

---

**Name conflicts resolved** (multiple `route.ts`, `page.tsx`, `telegram.ts`):
- `auth_telegram_route.ts` ← `app/api/auth/telegram/route.ts`
- `profile_sync_route.ts` ← `app/api/profile/sync/route.ts`
- `parties_nearby_route.ts` ← `app/api/parties/nearby/route.ts`
- `map_page.tsx` ← `app/(root)/map/page.tsx`
- `lib_telegram.ts` ← `lib/telegram.ts`
- `types_telegram.ts` ← `types/telegram.ts`
