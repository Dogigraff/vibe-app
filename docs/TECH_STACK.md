# Technical Stack & Engineering Standards: VIBE App

## 1. Core Framework & Runtime
* **Framework:** Next.js 14+ (App Router).
    * *Constraint:* Strict usage of Server Components by default. Client Components (`'use client'`) only for interactive UI (maps, forms, toggles).
* **Language:** TypeScript 5+.
    * *Constraint:* `noImplicitAny` must be true. Strict type safety for all database interfaces.
* **Package Manager:** npm (or pnpm/yarn, consistent usage required).

## 2. UI/UX & Design System
* **Styling Engine:** Tailwind CSS 3.4+.
    * *Config:* Mobile-first approach. Custom color palette defined in `tailwind.config.ts` (Zinc/Slate for dark mode base, Neon Cyan/Magenta for accents).
* **Component Library:** shadcn/ui.
    * *Core:* Radix UI primitives for accessibility.
    * *Icons:* Lucide React.
* **Animations:** Framer Motion.
    * *Usage:* Page transitions, modal appearances, "Like" animations, swipe gestures.
* **Utilities:**
    * `clsx` & `tailwind-merge`: For dynamic class conditional logic.
    * `class-variance-authority (cva)`: For creating reusable component variants.

## 3. Maps & Geolocation
* **Provider:** Yandex Maps JS API.
* **Wrapper:** `@pbe/react-yandex-maps`.
    * *Reasoning:* Provides React context hooks (`useYMaps`) for safer async loading compared to raw window objects.
* **Services:**
    * `ymaps.geolocation`: For initial user positioning.
    * `ymaps.suggest`: For "Taxi-style" address search autocomplete.

## 4. Backend-as-a-Service (Supabase)
* **Client SDK:** `@supabase/ssr` (Server-Side Rendering) + `@supabase/supabase-js`.
* **Auth:** Supabase Auth (Google OAuth + Email/Password).
    * *Middleware:* Protected routes via Next.js middleware checking Supabase sessions.
* **Database:** PostgreSQL.
* **Realtime:** Supabase Realtime (WebSockets).
    * *Usage:* Instant chat messages, Live location updates, Party status changes.
* **Storage:** Supabase Storage (Buckets for Avatars and Event covers).

## 5. State Management & Data Fetching
* **Client State:** Zustand.
    * *Store:* `useUserStore` (session), `useLocationStore` (coords), `useUIStore` (modals).
* **Server State / Caching:** TanStack Query (React Query) v5.
    * *Usage:* Caching fetch results from Supabase, optimistic UI updates (instant "Like" or "Join" feedback).

## 6. Forms & Validation
* **Form Logic:** React Hook Form.
* **Validation Schema:** Zod.
    * *Usage:* Validate login inputs, party creation forms, and profile updates before sending to server.

## 7. Utilities & Helpers
* **Dates:** `date-fns`.
    * *Usage:* Relative time ("2 hours ago"), countdown timers ("Expires in 30 min").
* **Maps Math:** `geolib` (optional) or PostGIS (server-side) for distance calculations.

## 8. Deployment & Environment
* **Platform:** Vercel.
* **Environment Variables:**
    * `NEXT_PUBLIC_SUPABASE_URL`
    * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    * `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`
    * `NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY`
    * `NEXT_PUBLIC_SITE_URL`

## 9. Directory Structure (Key Areas)
/app
/(auth)      # Login/Register (Public)
/(root)      # Main app (Protected: Map, Profile)
/api         # Route Handlers
/components
/ui          # Shadcn primitives (Button, Input)
/shared      # Reusable components (BottomNav, Header)
/features    # Domain logic (Map, Chat, ProfileCard)
/lib
/supabase    # Client initialization
/utils.ts    # CN helper
/hooks         # Custom hooks
/types         # DB Interfaces