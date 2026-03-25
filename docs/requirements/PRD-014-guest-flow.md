# PRD-014 — Unauthenticated / Guest Flow

**Status:** Draft
**Date:** 2026-03-24
**Mockup:** `docs/requirements/guest-flow.html`

---

## 1. Problem

Today, PlanUltra requires a Google sign-in before a user can do anything. A prospective user who lands on the marketing page has no way to try the product. This creates friction and likely kills conversion — people won't create an account for a tool they've never touched.

---

## 2. Goal

Let anyone use PlanUltra without an account. Their data lives in `localStorage`. A persistent banner reminds them it won't be saved. They can create an account at any point, at which point we either migrate their data or start fresh.

---

## 3. Scope

- Guest entry point on the landing page ("Try it without an account")
- Persistent banner inside the app (guest mode indicator + CTA)
- Full app functionality in guest mode (GPX upload, plan editing, packing list, etc.)
- Account creation / login flow from guest mode
- Decision: migrate localStorage data to DynamoDB on account creation, or reset?

Out of scope: crew sheet sharing (requires a user ID for the share token), admin screens.

---

## 4. Guest Entry Points

### 4.1 Landing Page CTA

Below the primary "Sign in with Google" button, add a secondary link:

> **Try it without an account →**

Styling: muted text link, not a full button. Makes it feel like a lightweight escape hatch, not an equal alternative to signing in.

### 4.2 Sign-In Page

The `/signin` page (if a separate page exists) should also show the same secondary link below the Google OAuth button.

---

## 5. Guest Session Mechanics

- On clicking "Try it without an account", set `localStorage.item('guestMode', 'true')` and redirect to `/dashboard`.
- All race data (races, sections, plan fields) that would normally write to DynamoDB instead writes to `localStorage` under a structured key schema (see §8).
- No user ID is required. A transient `guestId` (UUID v4, generated once and stored in `localStorage`) can be used for local keying if needed.
- The app reads from `localStorage` instead of `/api/races` etc. when in guest mode.
- GPX upload, plan editing, autosave (debounced writes to `localStorage`), section management — all work normally.
- Features that require a persistent server identity are disabled with a clear explanation:
  - Crew sheet publishing (requires share token + server URL)
  - Any future social/sharing features

---

## 6. Guest Banner

A persistent banner sits at the top of every app screen in guest mode, above the main nav.

**Copy:**
> ⚠️ You're in guest mode — **your data isn't being saved.** [Create a free account →]

**Behaviour:**
- Non-dismissible (reappears on page reload)
- "Create a free account →" opens the sign-in/OAuth flow
- Banner disappears once the user is authenticated

**Design:**
- Background: amber/warning tone — distinct from the Ridge Blue nav
- Text: dark, high contrast
- Height: ~40px, compact
- Full-width, above `<header>`

---

## 7. Cost/Benefit: Migrate vs. Reset on Account Creation

This is the key implementation question. Two options:

### Option A — Migrate localStorage → DynamoDB on sign-in

When the user authenticates (Google OAuth callback), detect that they were in guest mode, read all `localStorage` race/section data, and write it to DynamoDB under their new user ID.

**Pros:**
- Zero data loss. User builds a plan, creates account, data is there.
- Feels seamless and trustworthy.

**Cons:**
- Non-trivial implementation. The OAuth callback (`/api/auth/callback`) needs to pull from localStorage — but localStorage is client-side, and the callback is server-side. Requires an intermediate client step: after OAuth completes, a client component reads localStorage and POSTs the data to an API route before clearing it.
- Edge cases: partial writes, race condition if user has multiple tabs, orphaned localStorage data if migration fails.
- If a user signs into an *existing* account that already has races, you have a merge problem. Do you append? Overwrite? The user probably doesn't expect their guest data to appear alongside their saved races.
- Testing surface area is significantly larger.

**Estimated effort:** 2–3 days

### Option B — Reset on sign-in (Recommended)

When the user authenticates, clear guest `localStorage` data and start fresh with an empty dashboard.

**Pros:**
- Simple. The OAuth flow is unchanged. No migration logic. No merge problem.
- Predictable: user signs in, they see their account (empty or with existing races).
- The banner copy already sets the expectation that data won't be saved.

**Cons:**
- Any plan built in guest mode is lost on sign-in.
- If a user spent significant time building a plan before creating an account, that's frustrating.

**Mitigating the con:**
The banner copy sets the expectation clearly. We can also show a confirmation modal at sign-in time: *"Creating an account will start fresh — your guest data will be cleared. Continue?"* This gives the user a moment to pause, but doesn't require us to implement migration.

**Estimated effort:** 0.5 days (mostly the localStorage read/write layer, which is needed either way)

### Recommendation

**Ship Option B first.** The guest flow's primary value is letting people *evaluate* the app, not build a production plan. Most users who convert to accounts will start fresh anyway. If post-launch data shows users are investing heavily in guest sessions before converting, revisit Option A then.

---

## 8. localStorage Schema

Keys are namespaced under `planultra_guest_`:

```
planultra_guest_mode          = "true"
planultra_guest_id            = "<uuid>"
planultra_guest_races         = JSON array of Race objects
planultra_guest_race_<id>_sections = JSON array of SectionPlan objects
```

This mirrors the DynamoDB structure closely so the data layer can be swapped with minimal changes.

---

## 9. Data Layer Abstraction

To avoid `if (guestMode)` scattered everywhere, introduce a thin data-access layer:

```ts
// lib/data-layer.ts
export function useDataLayer() {
  const isGuest = typeof window !== 'undefined' && localStorage.getItem('planultra_guest_mode') === 'true'
  return isGuest ? guestDataLayer : serverDataLayer
}
```

- `serverDataLayer` — existing `/api/races` fetch calls
- `guestDataLayer` — reads/writes to `localStorage`

Both implement the same interface: `getRaces()`, `createRace()`, `updateRace()`, `deleteRace()`, `getSections()`, etc.

This keeps components clean and makes a future Option A migration more achievable if needed.

---

## 10. Disabled Features in Guest Mode

| Feature | Guest behaviour |
|---|---|
| Crew sheet publish | Button disabled, tooltip: "Create an account to share with your crew" |
| Crew sheet URL | Not shown |
| All plan/section editing | Fully functional |
| GPX upload | Fully functional |
| Race creation | Fully functional |
| Auto-save | Writes to localStorage with same 600ms debounce |

---

## 11. Sign-Out / Session Expiry in Guest Mode

Guest mode has no server session. If the user closes the tab and comes back:
- `localStorage` persists (they're still in guest mode with their data intact)
- No re-authentication required
- Banner still shows

If the user manually clears browser storage, data is gone — this is expected and consistent with the banner warning.

---

## 12. Implementation Issues

**A — Client-side data layer in server components**
The existing dashboard page is likely a server component. Guest mode detection and localStorage reads must happen client-side. The dashboard will need a client wrapper or the data-layer hook to be called from a client component.

**B — Hydration mismatch**
`localStorage` is not available during SSR. Any component that reads guest data must guard with `typeof window !== 'undefined'` or use `useEffect` to read after mount.

**C — Route protection**
Currently, middleware likely redirects unauthenticated users to `/signin`. Guest mode needs an exception: if `planultra_guest_mode` cookie is set (mirror the flag to a cookie so middleware can read it), allow through to `/dashboard` and child routes.

Use a short-lived cookie `pua_guest=1` set on the client when guest mode is activated. Middleware checks for either a valid session or this cookie.

**D — API routes in guest mode**
Client components in guest mode must not call `/api/races` etc. (they'll get 401). The data layer abstraction (§9) handles this, but be careful with any component that calls API routes unconditionally.

**E — Clearing guest data**
On sign-in (Option B), clear all `planultra_guest_*` keys from localStorage and delete the `pua_guest` cookie. Do this in the NextAuth `signIn` callback or on the post-OAuth redirect client component.

---

## 13. Mockup

See `docs/requirements/guest-flow.html` for interactive mockup covering:
1. Landing page with "Try without account" CTA
2. Guest dashboard with persistent banner
3. Guest plan view (full functionality, crew publish disabled)
4. Sign-in confirmation modal (Option B reset warning)
