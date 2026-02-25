# Product Requirements Document (PRD): VIBE App (V3 - Production Ready)

## 1. Product Vision
**VIBE** is a real-time geo-social network.
**Core Promise:** "Don't be lonely. Find your vibe in 5 minutes."

## 2. The "Empty Map" Solution (Density Mechanics)
1.  **Ambient Heatmap:** Visual layer indicating user activity in the last 24h.
2.  **"On the Prowl" Counter:** Aggregated count of active users in 5km radius.
3.  **Cold Start Bonus:** +Reputation for creating the first Vibe in a quiet zone.

## 3. Core Mechanics & Lifecycle
1.  **Light Up (Active):** Host creates Vibe. Status = `active`.
2.  **Knock-Knock:** Guests request to join.
3.  **Connect:** Host approves -> Chat unlocks.
4.  **Expire (Soft End):** Timer hits 0. Status -> `expired`.
    - Party disappears from Map.
    - Chat becomes Read-Only.
    - Rate Flow triggers ("Did you meet?").
5.  **Archive (Hard End):** 24h after expiration. Status -> `archived`.

## 4. Reputation & Safety System
* **Reputation Logic (The Math):**
    * **Base:** Starts at 10.
    * **+1:** Successful meetup (confirmed by Host).
    * **+5:** Hosting a Vibe with >2 guests.
    * **-5:** Valid Report against user.
    * **-2:** "No Show" (Accepted but didn't come).
* **Anti-Abuse Limits (MVP Hardcoded):**
    * Max 5 active "Knocks" at once.
    * Max 1 active Vibe creation per user.
    * **Shadow Ban:** User can perform actions, but no one sees them.

## 5. Monetization Hooks (Disabled for MVP)
*Architecture must support these for future toggle-on:*
* **Boost Vibe:** Pin to top of list / Special color.
* **Unlimited Knocks:** Bypass the 5-knock limit.
* **Ghost Mode:** View vibes without appearing on "On the Prowl" counter.

## 6. Key Features (MVP Scope)

### A. Radar (Map)
* **Filters:** "My Vibes", "Friends".
* **Optimization:** Fetch radius limited to 15km.

### B. Creation
* **Modes:** "Right Now" (GPS) vs "Plan" (Manual Address).
* **Privacy:** Exact location radius hidden until approved.

### C. Chat & Members
* **Roster:** Host can "Kick" members (revokes access immediately).
* **Safety:** "Report" button in chat header.

## 7. Success Metrics
* **Liquidity:** % of "Knocks" that turn into "Chats".
* **Safety Score:** % of Vibes without reports.