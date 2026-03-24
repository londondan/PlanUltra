# PRD-012: Admin Screen — Race Library Management
**Status:** Draft
**Created:** 2026-03-23
**Reference mockups:** `docs/requirements/mockups/admin-race-library.html`

---

## 0. Mandatory Pre-Reading

Review:
- **PRD-003** — Ridge Light design system
- `src/app/(app)/layout.tsx` — existing app nav (the header that shows "Dashboard")
- `src/app/(app)/dashboard/page.tsx` — existing dashboard pattern to match
- `src/lib/db/races.ts` — existing data layer to understand `Race` type and query patterns

---

## 1. Summary

PlanUltra will maintain a **Race Library** — a curated set of real ultra marathon races that any user can add to their dashboard as a starting point, rather than uploading a GPX from scratch. This PRD covers the **admin interface** for building and maintaining that library: a gated admin section accessible only to `danrjames@gmail.com`, with a single screen for listing, adding, editing, and deleting library races.

The race library itself (how users browse and select from it) is a separate concern and will be covered in a future PRD. This PRD focuses entirely on the admin side.

---

## 2. Access Control

### 2.1 Admin user

The admin section is restricted to a single hardcoded email address: **`danrjames@gmail.com`**.

This is intentional simplicity — no roles table, no admin flag in DynamoDB, no UI to promote users. A single env-var-backed constant is sufficient for now.

```ts
// src/lib/admin.ts
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'danrjames@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
```

`ADMIN_EMAILS` is a comma-separated env var to allow future expansion without a code change.

### 2.2 Route protection

All routes under `src/app/(app)/admin/` check `isAdmin(session.user.email)` and redirect to `/dashboard` if false. This check happens in each page's server component — not middleware — to keep it simple and auditable.

```ts
const session = await auth()
if (!isAdmin(session?.user?.email)) redirect('/dashboard')
```

### 2.3 Nav link visibility

The "Admin" link in the app header is only rendered when the current user is an admin. Because `layout.tsx` is a server component, it can call `auth()` and `isAdmin()` directly.

The "Admin" link appears **immediately to the right of "Dashboard"** in the nav, before the `UserMenu`.

---

## 3. Navigation Changes

**File:** `src/app/(app)/layout.tsx`

Current nav:
```
Dashboard  [UserMenu]
```

Updated nav (admin users only):
```
Dashboard  Admin  [UserMenu]
```

The "Admin" link uses the same style as "Dashboard": `text-sm font-medium text-primary hover:opacity-70 transition-opacity`. No special badge or highlight — it should feel like a peer nav item, not a warning.

---

## 4. Admin Dashboard (`/admin`)

A minimal landing page. No content beyond a single card for "Race Library". This exists to give the admin section room to grow — future tools (user management, feedback review, etc.) can be added here without restructuring.

**Layout:** matches the existing dashboard page pattern — `space-y-6`, heading block, then a card grid.

```
┌──────────────────────────────────────────┐
│  Admin                                   │
│  PlanUltra admin tools                   │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │  📚 Race Library                 │   │
│  │  Manage the curated race library  │   │
│  │  that users can pick from when   │   │
│  │  adding a new race.              │   │
│  │                           →      │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

Card links to `/admin/race-library`. Uses the PRD-003 interactive card style (Mist fill, Sky border, Ridge Blue left-border on hover).

---

## 5. Race Library Screen (`/admin/race-library`)

### 5.1 Layout

```
┌────────────────────────────────────────────────┐
│  ← Admin        Race Library         [+ Add]   │
│  Manage the races available in the library      │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │  Western States 100                      │  │
│  │  100.2 mi · Jun 28, 2025                 │  │
│  │  California                   [Edit] [✕] │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Bear 100                                │  │
│  │  100.3 mi · Sep 27, 2025                 │  │
│  │  Utah                         [Edit] [✕] │  │
│  └──────────────────────────────────────────┘  │
│  ...                                           │
└────────────────────────────────────────────────┘
```

**Back link:** "← Admin" — small, Deep Ridge 60% opacity, links to `/admin`.

**Heading:** "Race Library" — DM Sans, 24px, weight 800.

**Add button:** `[+ Add race]` — primary Ridge Blue button, top-right, links to `/admin/race-library/new`.

**Race rows:** one card per library race, sorted by race date ascending. Each card shows:
- Race name (DM Sans, 16px, weight 700)
- Distance + date (Geist Sans, 13px, Deep Ridge 60% opacity)
- Location/state (Geist Sans, 13px, Deep Ridge 50% opacity)
- **Edit** button → `/admin/race-library/[raceId]/edit`
- **Delete** button (✕ icon) → triggers confirmation dialog, then deletes

### 5.2 Empty state

If no library races exist yet:

```
┌──────────────────────────────────────────────┐
│  No races in the library yet.                │
│  Add the first one to get started.           │
│                [+ Add race]                  │
└──────────────────────────────────────────────┘
```

---

## 6. Add / Edit Race Flow

Both add and edit use the **same form component** — `AdminRaceForm`. The form reuses the existing race creation flow as much as possible.

### 6.1 Fields

All fields from the existing user race creation flow, plus two admin-only fields:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Race name, e.g. "Western States 100" |
| `date` | date | Race date |
| `startTime` | time | Typical start time, e.g. "05:00" |
| `timezone` | string | Race timezone |
| `distance` | number | Miles |
| `location` | string | City/state or region, e.g. "Squaw Valley, CA" |
| `gpxData` | file / string | GPX file upload (same as user flow) |
| `isLibraryRace` | boolean | Always `true` for admin-created races — not shown in form, set server-side |
| `libraryDescription` | string | Short description shown in the race picker (max 160 chars). Admin-only field. |

### 6.2 Routes

- `GET /admin/race-library/new` → blank `AdminRaceForm`
- `GET /admin/race-library/[raceId]/edit` → `AdminRaceForm` pre-populated with existing data
- `POST /api/admin/races` → create library race
- `PUT /api/admin/races/[raceId]` → update library race
- `DELETE /api/admin/races/[raceId]` → delete library race

All API routes verify `isAdmin(session.user.email)` and return `403` if not.

### 6.3 Form UX

The add/edit page heading should clearly indicate context:
- Add: "Add race to library"
- Edit: "Edit — [Race Name]"

A "Cancel" link returns to `/admin/race-library` without saving. The save button reads "Save to library" (add) or "Save changes" (edit).

---

## 7. Delete Confirmation

Clicking the delete (✕) button on a race row opens a confirmation dialog before any destructive action.

```
┌──────────────────────────────────────┐
│  Delete "Bear 100"?                  │
│                                      │
│  This will permanently remove the   │
│  race from the library. Users who   │
│  have already added it to their     │
│  dashboard will not be affected.    │
│                                      │
│  [Cancel]          [Delete race]    │
└──────────────────────────────────────┘
```

Uses the existing shadcn/Base UI `Dialog` component. "Delete race" button uses `variant="destructive"`.

---

## 8. Data Model

### 8.1 Library races in DynamoDB

Library races are stored in the **same table** as user races, but under a reserved partition key:

```
PK: USER#__LIBRARY__
SK: RACE#<raceId>
```

This approach:
- Requires zero schema changes — the existing `getRacesByUser` and `createRace` functions work if given `userId = '__LIBRARY__'`
- Keeps library races logically isolated from user data
- Makes querying simple: `getUserRaces('__LIBRARY__')` returns all library races

The `__LIBRARY__` sentinel value is defined as a constant:

```ts
// src/lib/db/races.ts
export const LIBRARY_USER_ID = '__LIBRARY__'
```

### 8.2 New fields on Race record

| Field | Type | Default |
|---|---|---|
| `isLibraryRace` | `boolean` | `false` |
| `libraryDescription` | `string \| null` | `null` |
| `location` | `string \| null` | `null` |

These fields are additive — existing race records without them are treated as having defaults. No migration needed.

---

## 9. API Routes

### `GET /api/admin/races`
Returns all library races. Used by the admin list screen.

### `POST /api/admin/races`
Creates a new library race. Body: same shape as `POST /api/races` plus `libraryDescription` and `location`. Sets `userId = LIBRARY_USER_ID` and `isLibraryRace = true` server-side.

### `PUT /api/admin/races/[raceId]`
Updates a library race. Same field set as above.

### `DELETE /api/admin/races/[raceId]`
Deletes the race and all associated section records (same cascade logic as `DELETE /api/races/[raceId]`).

All four routes are under `src/app/api/admin/` and all check `isAdmin()` before proceeding.

---

## 10. Copy-on-Add: User Adds a Library Race

When a user selects a race from the library on the "Add a race" screen, the app must **deep-copy** the library race into the user's own account. The user gets a fully independent copy — edits to their race never affect the library original, and admin edits to the library don't silently mutate users' existing plans.

### 10.1 What gets copied

1. The `Race` record — all fields except `userId` (set to the new user's ID), `raceId` (new UUID), `createdAt` (now), `crewShareToken` (cleared), `crewPublishedAt` (cleared), `runnerName` (cleared). The user can then set their own race date before creation.
2. All `SectionPlan` records for that library race — each gets a new `raceId` matching the user's copy, but all section content (gear, notes, baggies, conditions) is preserved.

### 10.2 New API endpoint

```
POST /api/races/from-library
Body: { libraryRaceId: string, date: string, startTime: string, timezone: string }
```

Server-side:
1. Fetch the library race: `getRaceById(LIBRARY_USER_ID, libraryRaceId)` — 403 if not found or not a library race.
2. Fetch its sections: `getSectionPlans(libraryRaceId)`.
3. Create a new race under the user's ID using the library race's GPX and fields, overriding date/startTime/timezone from the request body.
4. Duplicate all section records under the new `raceId`.
5. Return the new race — client redirects to `/dashboard/[newRaceId]/setup`.

### 10.3 UI change on the "Add a race" screen

The existing `CURATED_RACES` static array and the "Race Library" tab on `src/app/(app)/dashboard/new/page.tsx` must be **replaced** to fetch library races dynamically from DynamoDB (see §10.4). The tab UI stays the same; only the data source changes.

When the user selects a library race, instead of calling `POST /api/races` with the GPX inline, the client calls `POST /api/races/from-library` with `{ libraryRaceId, date, startTime, timezone }`. The user still fills in their specific race date and start time before submitting.

### 10.4 Migration: retire `CURATED_RACES`

`src/data/curated-races/index.ts` currently holds a static array of three races (Western States, Leadville, Hardrock) with local GPX paths. Once the admin library is live:

1. The admin uses the new admin UI to create DynamoDB-backed versions of these three races, uploading the real GPX files.
2. `CURATED_RACES` is deleted from the codebase.
3. The "Race Library" tab on the new-race page fetches from `GET /api/library/races` instead.

This migration is a separate deployment step — the static list can remain in place during the transition until the admin has populated the DynamoDB library.

---

## 11. Implementation Issues for Dev Agent

**Issue A — `isAdmin` check in layout**
`src/app/(app)/layout.tsx` currently doesn't call `auth()`. To show/hide the Admin nav link it will need to — make it `async` and add the check. Since layout is already a server component this is straightforward.

**Issue B — `__LIBRARY__` sentinel must never appear in user-facing queries**
`getRacesByUser(userId)` must explicitly exclude `userId === '__LIBRARY__'` results from user dashboards. Add a guard: if the caller passes `'__LIBRARY__'` directly, throw. The admin data layer functions should use `getLibraryRaces()` (a new wrapper) rather than `getRacesByUser`.

**Issue C — Reuse existing race form**
The existing race creation form (`src/app/(app)/dashboard/new/page.tsx` and associated components) should be extracted into a shared `RaceForm` component that both the user flow and admin flow consume. The admin version passes the extra `location` and `libraryDescription` fields; the user version does not.

**Issue D — No section data on library races initially**
Library races start with no sections (same as user races). The admin can use the same plan-building UI (`/admin/race-library/[raceId]/edit` → links to the plan screen) to add sections. This is the same flow a user would use after adding a race — it doesn't need to be rebuilt.

**Issue E — ADMIN_EMAILS env var**
Add `ADMIN_EMAILS=danrjames@gmail.com` to `.env.local` and to the deployment environment. Document in `.env.example`.

**Issue F — `POST /api/races/from-library` must be atomic enough**
The copy creates a Race record then N Section records in sequence. There is no DynamoDB transaction wrapping these (the section count can exceed 25, the transaction limit). If the race write succeeds but a section write fails, the user ends up with a partial plan. Mitigate with a try/catch that deletes the new Race record on any section write failure, so the user sees an error and can retry cleanly rather than ending up with a ghost race.

**Issue F2 — `getSectionPlans` uses `raceId` as the PK directly**
Looking at `src/lib/db/sections.ts`: sections are stored under `PK: RACE#<raceId>`, not under the user PK. This means any authenticated user who knows a library `raceId` could read its sections. This is acceptable for library races (they're not private), but ensure the admin delete route also calls `deleteSectionPlans(raceId)` to avoid orphaned section records.

**Issue G — New `GET /api/library/races` endpoint**
The user-facing "Race Library" tab needs a public (authenticated) endpoint to list library races. Create `GET /api/library/races` → calls `getRacesByUser(LIBRARY_USER_ID)`, returns the array filtered to `isLibraryRace === true`. This is distinct from the admin `GET /api/admin/races` endpoint.
