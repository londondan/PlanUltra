# PRD-031 — Crew Parking Planner: Re-orient the Site Around One Flow

**Status:** Draft
**Date:** 2026-09-23
**Supersedes:** PRD-014 (guest flow), PRD-023 (homepage reposition), `planultra_pivot_plan.md` Phases 3–4
**Absorbs:** PRD-026 (aid station setup), backlog items "Lapped race support" and "Shareable race-only crew template"
**Reuses:** PRD-022 (parking fields), PRD-029 (duplicate station names), PRD-030 (print density), PRD-003 (Ridge Light)

---

## 0. Mandatory Pre-Reading (for Claude Code)

- `src/app/crew/[token]/page.tsx` — the existing crew sheet. It already builds the `renderItems` list of crew stations with "bridge" groups of non-crew stations between them. **The plan view is a stripped-down version of this page. Do not rebuild it from scratch.**
- `src/app/(app)/dashboard/[raceId]/setup/page.tsx` — the existing station editor (unique-station grouping, crew toggle, parking panel, insert-by-mile)
- `src/app/api/races/[raceId]/aid-stations/insert/route.ts` — insert a station at a mile marker by interpolating on the track
- `src/lib/maps.ts` + `src/app/api/maps/resolve/route.ts` — turns a Google Maps link into coords, including short links
- `src/lib/gpx-parser.ts` — `extractAidStations`, loop detection (`isLoop`)
- `src/middleware.ts` — the auth gate that this PRD opens up

---

## 1. Summary

PlanUltra becomes a single-purpose tool: **build a crew access and parking plan for a race, and share or print it.** There is no sign-in, no pace, no ETAs, no weather, and no packing.

```
Home ──┬── Select a library race ──► Plan view (public)  ──► [Make my own copy] ─┐
       │                                                                          │
       └── Create a race ──► 1. GPX + date/time ──► 2. Aid stations & loops ──► 3. Crew details ──► Plan view
                                                          ▲                          ▲
                                                          └──── edit link ───────────┘
```

**Output:** a generic, time-free plan listing:
- each crew-accessible station with mileage, a Google Maps link, the parking type and crew instructions
- the stations crew can't reach between each pair of crew stops, in small type with mileage
- the distance to the next crew station

## 2. Goals / Non-goals

**Goals**
- A first-time visitor can go from the home page to a shareable, printable plan with no account.
- Loop races (N laps of one GPX) work correctly.
- Reuse the existing code. Most of the flow already exists behind auth.

**Non-goals (v1)**
- Arrival times (the race start time in the header is the only time shown), pace, weather, sun/night, packing, drop bags, calories
- Crew home base (PRD-028) and drive time/distance between stations. Both are built but hidden (§9).
- User accounts, "my plans" dashboard sync across devices
- Race director contact fields in the editor. They carry over from library races if present; there's no UI to add them.

---

## 3. Ownership model: no sign-in, secret edit link

### 3.1 Concept
Every plan has two capabilities, both unguessable tokens:

| Token | Grants | URL |
|---|---|---|
| `crewShareToken` (exists) | View / print | `/crew/<shareToken>` |
| `editKey` (new) | Edit everything | `/crew/<shareToken>/edit/<editKey>/…` |

Anyone with the edit link can edit. There is no recovery if it's lost. That's accepted for v1: the bookmark callout and device list in §3.4 are the only mitigation. Emailing the edit link is deferred.

### 3.2 Data
- Reuse the `Race` record. For anonymous plans: `userId = "ANON#<uuid>"`, so `PK = USER#ANON#<uuid>`, one owner per plan. No table or GSI changes.
- New fields on `Race`:
  - `editKeyHash: string`: SHA-256 of `editKey`. The raw key is never stored.
  - `lapCount?: number`: default 1 (see §5.3)
  - `sourceLibraryRaceId?: string`: set when copied from the library
- `crewShareToken` is generated **at creation**, not at "publish". Every plan is always viewable. The publish step is removed.
- Lookup: `getRaceByCrewToken` (existing GSI `CrewTokenIndex`), then compare `sha256(editKey)` against `editKeyHash` in constant time.

### 3.3 API auth
- Add `requirePlanEdit(req, shareToken, editKey)` in `src/lib/plan-access.ts`. It returns the `Race` or a 403.
- Every mutating route used by this flow switches from `auth()` to `requirePlanEdit`: aid-stations PUT, aid-stations/insert, race PATCH, maps/resolve.
- Suggested new route shape: `/api/plans/[shareToken]/…` with `editKey` in an `X-Edit-Key` header. The old `/api/races/[raceId]/…` routes stay for signed-in users and aren't linked from anywhere.
- `middleware.ts`: make `/`, `/new`, `/crew/*` and `/races/*` public.

### 3.4 Not losing the edit link
- After creation, show a full-width callout on step 2: "This is your private edit link. Bookmark it — anyone with it can edit." Include a copy button.
- Save `{shareToken, editKey, name, date}` in `localStorage` under `planultra_plans` (in try/catch). The home page shows "Your plans on this device" when that entry is present.
- Do not put the edit link in the printed plan or the share URL.

### 3.5 Abuse guards (anonymous writes)
- GPX upload limit: 10 MB. Reject anything that fails `parseGPX` on the server.
- Rate-limit `POST /api/plans` and `maps/resolve` per IP (e.g. 20/hour). An in-memory or DynamoDB TTL counter is fine.
- Anonymous plans get `<meta name="robots" content="noindex">`. Only library races are indexable.

---

## 4. Screen 0 — Home (`/`)

Replaces the marketing homepage. The FAQ page stays and moves to the footer.

- **Hero:** one line: "Crew parking and access plans for ultramarathons." Two CTAs: **Find your race** (scrolls to the list) and **Create a race** (→ `/new`).
- **Race list:** library races from `GET /api/library/races`. Each shows name, location, distance and next date if known. There's a text filter, and it's all client-side, since the library is small.
- **Your plans on this device** (only when `localStorage` has entries): links to each edit URL.
- Only **complete** library races are listed (§8.1).
- Selecting a library race → `/races/<slug>` (§8).

> ⚠️ **Contest:** the library has only a handful of races. At launch, "Select a race" will mostly return nothing, so **Create is the real primary path**. Don't lead with an empty search box. Show the list under the fold, with a fallback: "Don't see your race? Create it from a GPX."

---

## 5. Create flow

### 5.1 Step 1 — Race basics (`/new`)
Reuse `src/app/(app)/dashboard/new/page.tsx` with the curated-library picker removed (that lives on Home now).

| Field | Required | Notes |
|---|---|---|
| GPX file | Yes | Existing drag-drop and client-side parse preview |
| Race name | Yes | Auto-filled from the filename (existing) |
| Date | Yes | Shown in the plan header |
| Start time | No | Shown in the plan header (§6) when set. Keep the existing field and drop the required flag. |
| Timezone | No | Existing dropdown (PRD-013), auto-guessed from the GPX start. Used to label the start time in the header. |

Submit → `POST /api/plans` creates the Race, parses stations (existing `extractAidStations`), and generates `crewShareToken` + `editKey`. It returns both. The client saves them to localStorage (§3.4) and redirects to step 2.

### 5.2 Step 2 — Aid stations & loops (`…/edit/<editKey>/stations`)
Based on the existing setup page, **minus** the parking panel and drop-bag toggle (they move out or are hidden).

**Header:** progress `1 Basics ● 2 Aid stations ○ 3 Crew details ○ Plan`, plus the edit-link callout (§3.4).

**Loops control** (top of the page):
```
Number of loops  [ 1 ▾ ]   Each loop: 10.2 mi · Total: 10.2 mi
```
See §5.3.

**Station list:** one row per unique physical station (existing `physicalName` grouping), sorted by first mile.
```
MI 3.1 · 13.3 · 23.5    [ Ridge Road AS          ]    Crew ☐    🗑
```
- Rename: inline, applies to all visits (existing)
- **Crew access toggle**: the only flag on this screen
- Delete: removes all visits of that station
- **+ Add station**: name + mile marker. Uses the existing insert-by-mile route, which interpolates lat/lon from the track. For loop races, the mile entered is **within one loop** (0 – loop distance) and the station repeats every lap.
- Start / Finish (or Start/Finish on loops): locked, always crew.

Footer: `[← Back]` `[Continue → Crew details]`. Continue saves (PUT) the station list and `lapCount`.

**Empty state:** if the GPX had no waypoints, show only Start/Finish plus the prompt: "Your GPX has no aid stations. Add them by mile marker from the race website."

### 5.3 Loops — rules

This is the riskiest part of the PRD. The current parser assumes the GPX is **the whole course**.

- **Storage:** stations are stored **for one lap** (the GPX as uploaded) plus `race.lapCount`. Laps are **not** materialised in DynamoDB.
- **Expansion:** add a pure function `expandLaps(stations, lapCount, lapDistanceMi): AidStation[]` in `src/lib/laps.ts`, with unit tests. It is used by the plan view and by the mile badges on step 2.
  - Visit k of a station at lap-mile *m* → course mile `m + (k-1) × lapDistance`
  - Mid-course Start/Finish visits are named `Start/Finish (Lap 2)`, etc. Use PRD-029's disambiguation rendering for the duplicates.
  - The final visit is `Finish`
  - Crew access is **per station, every lap**. There's no per-lap toggle in v1.
- **Double-count guard:** if `lapCount > 1` and the GPX already revisits the start more than once (`extractAidStations` returns more than one Start/Finish visit), show the warning: "This GPX looks like it already contains multiple loops. Set loops to 1 unless it's a single lap." Don't block.
- **Non-loop GPX:** if `lapCount > 1` and `isLoop` is false (start and end more than 0.5 km apart), warn: "This course doesn't return to the start. Are you sure it's a loop?" Don't block. It could be an out-and-back.
- Changing `lapCount` never deletes station data. It only changes the expansion.

### 5.4 Step 3 — Crew details (`…/edit/<editKey>/crew`)
**One unified list of only the crew-accessible stations** (Start and Finish included), in course order. Each unique station appears once. For loops, show the visit miles in the badge.

```
┌─────────────────────────────────────────────────────────────┐
│ MI 13.3 · 23.5   Ridge Road AS                              │
│ Google Maps link  [ https://maps.app.goo.gl/…         ] ✓   │
│                   Resolved: 35.2231, -82.1102  (open ↗)     │
│ Parking type      [ Trailhead ▾ ]                           │
│ Instructions      [ Park at the upper lot; 200m walk… ]     │
└─────────────────────────────────────────────────────────────┘
```

| Field | Storage | Notes |
|---|---|---|
| Google Maps link | `crewParkingCoords` (existing) + **new** `crewParkingUrl` | Resolve on blur via the existing `resolveGoogleMapsInput`. Also accepts `lat,lng`. Keep the original URL, since it carries the place name and is a better link than bare coords. |
| Parking type | `crewParkingType` (existing) | Existing options plus **new: `shuttle` (label "Shuttle only"), `walk-in` (label "Walk-in / hike-in")**. Extend the `AidStation['crewParkingType']` union and every label map. |
| Instructions | `crewLocationNotes` (existing, 500 chars) | Multi-line |

- All fields are optional. PRD-026's §3.5.1 partial-data rules still apply.
- A resolve failure shows the existing error copy inline, and the station can still be saved with the URL unresolved.
- Footer: `[← Aid stations]` `[Save & view plan →]`
- No "skip". Leaving a station blank is the skip.

---

## 6. Plan view (`/crew/<shareToken>`)

A **mode of the existing crew sheet**, not a new page. With pace hidden, the page renders only the following.

**Header:** race name, date, **start time with timezone abbreviation** (e.g. `Sat, Oct 10 · Start 6:00 AM EDT`; omit the start part if no start time is set), total distance (with laps), and a QR code for the page (existing). Remove runner name, "published at" and the finish ETA. The start time is the only time on the page.

**Body:** the existing `renderItems` loop, run over `expandLaps(...)` output:

```
━━ START · MI 0.0 ─────────────────────────────────────────
   Parking lot · [Open in Google Maps ↗]  [QR]
   Park in main lot by the lodge. Crew tent area is behind the timing arch.

      Not crew-accessible:  Bear Gap MI 4.2 · Laurel Fork MI 7.9      ← small, muted
      Next crew stop: Ridge Road AS · 13.3 mi (+13.3)

━━ RIDGE ROAD AS · MI 13.3 ────────────────────────────────
   Trailhead · [Open in Google Maps ↗]  [QR]
   …
```

- **Crew station card:** name, mile(s), parking type, Maps link (prefer `crewParkingUrl`, fall back to coords, omit if neither), QR for the link (existing), instructions.
- **Bridge:** the list of non-crew stations with mileage in **small, muted type**, plus "Next crew stop: <name> · <mile> (+<leg distance>)".
- **Removed from the card:** ETA, arrival windows, weather, sun/night, drop-bag chips, drive time/distance, home-base legs.
- **Missing data:** a crew station with no link, type or notes still renders its name and mile, plus "No parking details yet" in muted type. On the edit side, a "Missing details" count shows on step 3.
- **Print:** keep PRD-030's print styles. Target one printed page per ~6 crew stations. "Print" button (existing).
- **Share:** the "Copy link" button copies `/crew/<shareToken>` only.
- If the viewer has this plan's edit key in localStorage, show an "Edit plan" link.

Implementation hint: add `mode: 'generic'` (the default for v1) and gate the ETA/weather/drive/home-base branches behind it, rather than deleting them.

---

## 7. Units
Miles are the default everywhere. The existing mi/km toggle is kept on the plan view only.

---

## 8. Library races

- **Public view:** `/races/<slug>` renders the same plan view (§6) for a library race. It's indexable, with `<title>` "<Race> crew access & parking guide".
- **Slug:** add a `slug` field to library races, set in the admin edit form. Look it up by querying `PK = USER#__LIBRARY__` and filtering on `slug`. The library is one small partition, so **no new GSI** is needed. This is simpler than the pivot plan's Phase 2 GSI, which can come later if the library grows.
- **Make my own copy:** calls a reworked `from-library` route that creates an anonymous plan (§3) and copies stations, parking data, `lapCount` and RD fields, with `sourceLibraryRaceId` set. The user picks the date on a one-field interstitial, then lands on step 2.
### 8.1 Completeness bar
A library race is **complete** when every crew-accessible station (Start and Finish included) has a Maps link: `crewParkingUrl` or `crewParkingCoords`. Compute this server-side as `isComplete` in `GET /api/library/races`.
- Incomplete races are **not listed on Home** and their `/races/<slug>` page is `noindex`. The URL still works if someone has it.
- The admin race list shows a completeness badge, e.g. `4/6 crew stops mapped`.

- The admin library editor (`/admin/race-library`) stays behind Google sign-in. It needs `lapCount` and `crewParkingUrl` added to reach parity.

---

## 9. What gets hidden (not deleted)

| Feature | Action |
|---|---|
| `/dashboard`, `/dashboard/[raceId]` (pace, plan, packing, weather tabs) | Remove from nav. The routes still work for signed-in users but aren't linked. |
| Sign-in button in header | Remove (admin reaches `/auth/signin` directly) |
| Marketing homepage sections (PRD-015/023) | Replaced by §4 |
| Crew sheet ETA, weather, drive segments, home base | Gated behind `mode !== 'generic'` |
| Drop-bag toggle | Hidden in the editor. Existing data is untouched. |
| Publish step (`/api/races/[raceId]/publish`) | Unused. A share token is created at plan creation. |

The 2 existing signed-in accounts keep working through the old routes. No migration.

---

## 10. Build phases (for Claude Code)

Each phase ships independently and leaves the site working.

| # | Phase | Key work | Done when |
|---|---|---|---|
| A | Anonymous ownership | `editKey`/`editKeyHash`, `requirePlanEdit`, `/api/plans/*` routes, middleware, rate limits | You can create a plan with curl and edit it with the key, and an edit without the key returns 403 |
| B | Create + stations + loops | `/new` without auth, step 2 page, `expandLaps` + tests, loop warnings | 3-loop race shows correct mile badges; double-count warning fires on a multi-lap GPX |
| C | Crew details | Step 3 page, `crewParkingUrl`, new parking types, resolve without auth | Short link, long link and `lat,lng` all resolve; partial saves work |
| D | Plan view | `mode: 'generic'` on crew sheet, bridge "next crew stop", missing-data state, print | Prints cleanly; the header start time is the only time on the page, and there's no weather |
| E | Home + library | New `/`, `/races/<slug>`, copy-to-edit, localStorage "your plans" | Library race viewable logged-out; incomplete races hidden from Home; copy lands in step 2 with data |
| F | Hide legacy | Nav/header cleanup, §9 table | No links to dashboard/pace/weather reachable from `/` |

**Test fixtures:** `docs/utils/test/cruel_jewel_sample.gpx` (point-to-point), plus a new single-lap loop fixture and a 2-lap fixture for the double-count guard.

---

## 11. Decisions (resolved 2026-09-23)

| # | Question | Decision |
|---|---|---|
| 1 | Edit-link recovery | Bookmark callout + device list (§3.4) is enough for v1. Email-my-link is deferred. |
| 2 | Drive time between crew stations | Hidden in v1 (§9). First candidate to turn back on. |
| 3 | Parking types | Add `shuttle` and `walk-in` (§5.4). |
| 4 | Start time | Shown in the plan header with timezone (§6). Optional on the form. |
| 5 | Library quality bar | Only complete races (every crew stop has a Maps link) are listed on Home and indexable (§8.1). |
