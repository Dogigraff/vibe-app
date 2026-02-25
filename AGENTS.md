# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**VIBE** is a Telegram Mini App (geo-social network) built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, and Supabase. See `README.md` for architecture and route details.

### Services

| Service | How to run | Port |
|---|---|---|
| Next.js dev server | `npm run dev` | 3000 |
| Local Supabase (PostgreSQL, Auth, Realtime, Storage) | `npx supabase start` | 54321 (API), 54322 (DB), 54323 (Studio) |

### Local Supabase setup

Docker is required. Start Supabase with `npx supabase start` — this runs PostgreSQL with PostGIS and applies all migrations from `supabase/migrations/`. A PostGIS bootstrap migration (`20260213000000_enable_postgis.sql`) was added to enable the `postgis` extension in the `public` schema (required by the `parties` table and spatial queries).

After starting Supabase, get local credentials with `npx supabase status -o env` and populate `.env.local` (see `.env.example` for template). Key vars for local dev:
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`
- `NEXT_PUBLIC_DEV_TEST_MODE=true` and `NEXT_PUBLIC_DEV_TG_MOCK=true` to bypass Telegram auth

### Common commands

Standard scripts are in `package.json`:
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with auto-fix
- `npm run format` — Prettier

### Gotchas

- The `supabase/config.toml` was regenerated via `supabase init` (original was a corrupt Windows path). If config is stale, re-run `npx supabase init --force`.
- Migration `20260224000000_security_hardening_v2.sql` had bugs fixed for local dev: `messages.sender_id` -> `messages.user_id`, wrong `moderation_events` columns, and incorrect function signatures in `ALTER FUNCTION`.
- Yandex Maps requires a real API key (`NEXT_PUBLIC_YANDEX_MAPS_API_KEY`) for the map to render. Without it, the map component won't load but the rest of the page works.
- The app has no automated test suite (no test runner configured).
