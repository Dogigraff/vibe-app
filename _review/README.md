# _review — Manual Review Mirror

This folder contains **exact copies** of critical production files for manual code review.

## Purpose
- Used **ONLY** for human review (security, logic, RLS, schema)
- Files here are mirrors—no code should be imported from this folder
- Originals remain in their normal project locations

## Contents
- `supabase/migrations/` — V3 schema, RLS policies, triggers, patches
- `lib/supabase/` — Supabase client, server, middleware helpers
- `middleware.ts` — Root Next.js middleware
- `package.json` — Project config and scripts
- `types/` — Database types (supabase.ts, db.ts)

## Missing Files
None. All listed files exist in the project.
