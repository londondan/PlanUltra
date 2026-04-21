# PRD-027 — Race Data Model: Race Facts vs Runner Plan + RD Contact Fields

**Status:** Draft
**Date:** 2026-04-18
**Extends:** `specs/database.md`, PRD-010 (Crew Sheet), PRD-012 (Admin Race Library), PRD-024 (Race Library Enhancements)
**Pre-reading:** `specs/database.md`, `specs/race-creation.md`, PRD-010 §5 (Crew Sheet Header), PRD-012 §10 (from-library copy flow)

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- **`specs/database.md`** — current Race, AidStation, and SectionPlan record shapes
- **PRD-012 §10.2** — `POST /api/races/from-library` copy flow (what gets copied when a user adds a library race)
- **PRD-010 §5** — Crew Sheet header layout (the target for RD contact display)
- **PRD-024 §2** — Aid station config in admin form (sets `crewParkingCoords` etc. on library sections — these are race-fact fields per this PRD)

Where this PRD conflicts with `specs/database.md`, **this PRD wins**. Update `specs/database.md` as part of implementation.

---

## 1. Summary

This PRD does two things:

1. **Formally defines the Race Facts / Runner Plan split** — a conceptual and documented boundary between data that belongs to the race itself (true for all runners) and data that belongs to a specific runner's plan. This boundary is enshrined in the database spec and copy logic, but does not require a new DynamoDB record type.

2. **Adds RD contact fields** — `rdName`, `rdPhone`, `rdEmail`, and `raceWebsiteUrl` to the Race record as the first concrete addition under the Race Facts category. These fields are set in the admin race library and displayed on the crew sheet header.

---

## 2. The Race Facts / Runner Plan Split

### 2.1 Motivation

Every Race record currently contains two categories of data:

- **Race Facts** — information true for every runner in the race: the course, aid station locations, parking, race date, start time, race director contact, race website. If 500 runners do Western States, these facts are the same for all of them.
- **Runner Plan** — information specific to one runner's execution: their target pace, estimated arrival times, what's in their drop bags, gear choices, crew notes.

These categories are currently commingled in the same DynamoDB records without explicit distinction. This causes problems:

- The admin race library stores Race Facts but has no clean way to express that Runner Plan fields don't belong there.
- When a user copies a library race, the copy logic must know which fields to carry over (Race Facts) and which to leave blank (Runner Plan). Currently this is implicit and fragile.
- There is no clear guide for where to add new fields — every addition requires a judgment call about which category it belongs to.

### 2.2 The boundary

The following table defines the canonical split. This is the authoritative reference — future field additions must be classified against it before implementation.

#### Race record — Race Facts (copy from library; same for all runners)

| Field | Description |
|---|---|
| `name` | Race name |
| `date` | Canonical race date (YYYY-MM-DD) |
| `startTime` | Typical race start time (HH:MM 24h) |
| `timezone` | IANA timezone string |
| `startLat`, `startLon` | Race start coordinates |
| `gpxData` | Compressed GPX — defines the course |
| `rdName` | Race director name *(new — §3)* |
| `rdPhone` | Race director phone number *(new — §3)* |
| `rdEmail` | Race director email *(new — §3)* |
| `raceWebsiteUrl` | Official race website URL *(new — §3)* |

#### Race record — Runner Plan (never copied from library; runner-specific)

| Field | Description |
|---|---|
| `caloriesPerHour` | Runner's calorie burn rate for drop bag planning |
| `targetFinishMinutes` | Runner's estimated finish time |
| `crewShareToken` | Crew sheet publish token (runner-specific) |
| `crewPublishedAt` | Crew sheet publish timestamp |

#### AidStation record — Race Facts (copy from library)

| Field | Description |
|---|---|
| `name`, `physicalName` | Station names |
| `lat`, `lon` | Station coordinates |
| `distanceFromStart`, `distanceFromPrev` | Course distances |
| `elevationGain` | Elevation (reserved) |
| `order`, `visitNumber` | Sort order and loop count |
| `isStart`, `isFinish` | Course position flags |
| `crewParkingCoords` | Parking location (set by admin) |
| `crewParkingType` | Parking type enum |
| `crewLocationNotes` | Parking notes (set by admin) |
| `hasCrewAccess` | Whether this station permits crew (set by the race organisation, not the runner) |

#### AidStation record — Runner Plan (not copied from library; runner-specific)

| Field | Description |
|---|---|
| `hasDropBag` | Whether the runner is using a drop bag here |

> **Note on hasDropBag:** Drop bag availability at a station is a Race Fact (the race rules it in or out), but whether *this runner* is using a drop bag there is a Runner Plan decision. A future PRD may introduce a `dropBagAllowed` Race Fact field to distinguish the race rule from the runner's choice — deferred for now. See backlog.

#### SectionPlan record — Runner Plan only

All fields on SectionPlan records are Runner Plan data. SectionPlan records are never present on library races and are never copied from library to user.

### 2.3 Copy semantics

When `POST /api/races/from-library` creates a user race from a library template:

1. All **Race Fact** fields on the Race record are copied verbatim.
2. All **Runner Plan** fields on the Race record are initialised to `null` / their default empty state — they are not carried over from the library.
3. All AidStation records are copied. **Race Fact fields** on each station are copied verbatim (including `hasCrewAccess`). **Runner Plan fields** (`hasDropBag`) are initialised to their defaults (`false`).
4. No SectionPlan records are copied — the user starts with an empty plan.

This logic must be explicit in the `from-library` handler. Add a comment block at the top of the copy function naming the two categories and listing which fields belong to each, so future developers know exactly what to do when adding a new field.

### 2.4 No new DynamoDB record type

The split is conceptual and documented, not structural. Race Facts and Runner Plan data continue to live in the same DynamoDB records. A future PRD may introduce a true `RaceTemplate` record type if the use case requires it (e.g. multiple runners sharing a live template, or promoting a user race to the library). That is explicitly out of scope here.

---

## 3. RD Contact Fields

### 3.1 New fields on the Race record

Add four new optional fields to the Race record:

```ts
rdName?: string          // Race director's name, e.g. "Craig Thornley"
rdPhone?: string         // Phone number, stored as a string, e.g. "+15305551234"
rdEmail?: string         // Email address, e.g. "rd@wser.org"
raceWebsiteUrl?: string  // Full URL, e.g. "https://www.wser.org"
```

All four are optional and nullable. Existing Race records without these fields are treated as having them unset — no backfill required.

**Validation:**
- `rdPhone`: stored as entered, no normalisation. Display as entered.
- `rdEmail`: basic format check (`x@x.x`) on the admin form. No server-side enforcement.
- `raceWebsiteUrl`: must start with `https://` or `http://`. Prepend `https://` if the admin omits the scheme.
- `rdName`: free text, max 100 chars.

### 3.2 Admin form — library races

Add a **"Race Director & Website"** collapsible section to the admin race library add/edit form (`/admin/race-library/new` and `/admin/race-library/[raceId]/edit`). This section sits below the existing race metadata fields (name, date, start time, timezone) and above the Aid Stations panel (PRD-024 §2).

```
┌──────────────────────────────────────────────────────────┐
│  Race Director & Website                      [▾ expand] │
├──────────────────────────────────────────────────────────┤
│  Director name                                           │
│  [────────────── Craig Thornley ──────────────]          │
│                                                          │
│  Phone number                                            │
│  [────────────── +1 530 555 1234 ─────────────]          │
│                                                          │
│  Email                                                   │
│  [────────────── rd@wser.org ─────────────────]          │
│                                                          │
│  Race website                                            │
│  [────────────── https://www.wser.org ────────]          │
└──────────────────────────────────────────────────────────┘
```

All four fields use standard text inputs, same styling as other admin form fields. The section is collapsed by default if all four fields are empty; expanded by default if any field is set.

Save behaviour: same as other admin form fields — held in local state, written on "Save to library" / "Save changes".

### 3.3 User race — read-only display only

Users do not edit RD contact fields on their own races. These are Race Facts set by the admin. When a user copies a library race, the four fields are carried over verbatim and remain read-only.

There is no UI in the runner-facing app for viewing or editing these fields — they surface only on the crew sheet (§3.4). If a runner has created a race by uploading their own GPX (not from the library), these fields will be null and simply won't appear on the crew sheet.

### 3.4 Crew sheet — header display

RD contact info is added to the crew sheet header (PRD-010 §5). It appears below the existing race metadata line (date + distance) and above the published timestamp.

**Layout (condensed, inline):**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         WESTERN STATES 100                              │
│         Crew sheet for Alex Rivera                      │
│         Jun 28, 2026 · 100.2 mi                         │
│                                                         │
│         Craig Thornley · 📞 +1 530 555 1234             │
│         rd@wser.org · wser.org ↗                        │
│                                                         │
│         Published Jun 15, 2026 at 9:42 AM               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Rendering rules:**

- The RD contact block is only rendered if at least one of the four fields is non-null. If all four are null, the block is omitted entirely — no empty row.
- Line 1: `[rdName]` (if set) · `📞 [rdPhone]` (if set). The `📞` emoji is used on screen only; on print, substitute plain text `Ph:`.
- Line 2: `[rdEmail]` (if set, as a `mailto:` link) · `[domain only of raceWebsiteUrl] ↗` (if set, as an `<a>` link opening in a new tab). Show the domain only (strip `https://www.`), not the full URL, to keep it compact.
- Typography: Geist Sans, 12px, white 65% opacity — same weight as the date/distance line but slightly muted to signal secondary info.
- On print: links render as plain text (existing `@media print` rule strips link styling). The `↗` arrow is omitted on print.

**Print behaviour:** The phone number is the most important field for crew on race day. Ensure it is prominent and not suppressed by print styles.

---

## 4. `specs/database.md` Update

As part of implementation, update `specs/database.md` to:

1. Add the Race Facts / Runner Plan classification table from §2.2 as a new section ("Data classification") immediately after the existing "Race record shape" block.
2. Add the four new fields (`rdName`, `rdPhone`, `rdEmail`, `raceWebsiteUrl`) to the Race record shape.
3. Add a note to the AidStation record shape clarifying which fields are Race Facts vs Runner Plan.
4. Update the "Notes for future development" section to reference this PRD and the future `RaceTemplate` possibility.

---

## 5. API Changes

### 5.1 `PUT /api/admin/races/[raceId]`

Accept the four new fields in the request body. Write them to the Race record. No special handling — they are plain string attributes.

### 5.2 `POST /api/races/from-library`

Update the copy handler to explicitly copy the four new fields from the library Race to the user Race. Add the comment block described in §2.3 to make the Race Facts / Runner Plan split visible in code.

### 5.3 `GET /api/crew/[token]` (crew sheet data fetch)

The crew sheet server component already reads from the Race record. No API route change needed — the four new fields will be present on the Race record and available to the server component. The server component (§3.4) conditionally renders the RD block based on field presence.

---

## 6. Implementation Notes for Dev Agent

**Issue A — No migration required**
The four new fields are optional. Existing Race records without them will have `undefined` for these attributes when read from DynamoDB — treat as `null` in application code. No backfill script needed.

**Issue B — Copy logic must be explicit**
The `from-library` copy function must not use a shallow spread of the library Race record to create the user Race. It must explicitly list fields being copied and fields being initialised fresh. Add a `// RACE FACTS` and `// RUNNER PLAN (initialise fresh)` comment block as described in §2.3. This is the guard against future developers accidentally copying Runner Plan fields.

**Issue C — Admin form field order**
The "Race Director & Website" section (§3.2) sits between the existing race metadata fields and the Aid Stations panel (PRD-024 §2). If PRD-024 has not yet been implemented, it sits above the Save button.

**Issue D — Phone number as string**
Store `rdPhone` as a string, not a number. Do not parse, normalise, or validate format beyond basic non-empty check. Phone number formats vary internationally and normalisation causes data loss. Display exactly as entered.

**Issue E — Website URL display on crew sheet**
To extract the display domain from `raceWebsiteUrl`: `new URL(raceWebsiteUrl).hostname.replace(/^www\./, '')`. Wrap in a try/catch — if the URL is malformed, fall back to displaying the raw string. Do not throw.

**Issue F — Crew sheet print styles**
The phone number line must not be suppressed by `@media print`. The existing print rule hides `.print-hide` elements — do not apply that class to the RD contact block. The `↗` link icon should be removed on print via `@media print { .rd-external-icon { display: none; } }`.

---

## 7. Out of Scope

- User ability to edit RD contact fields on their own races — these are admin-managed Race Facts.
- Surfacing RD contact info anywhere in the app other than the crew sheet header.
- A `crewAllowed` Race Fact field distinct from the runner's `hasCrewAccess` flag — noted in §2.2, deferred.
- Promoting a user race to a library entry — the Race Facts / Runner Plan split defined here makes this straightforward in future, but the feature itself is a separate PRD.
- A true `RaceTemplate` DynamoDB record type — deferred per §2.4.
- Phone number click-to-call behaviour on mobile (the `tel:` link scheme) — the phone renders as plain text for now. A future pass can wrap it in `<a href="tel:...">`.

---

## 8. Affected Files

| File | Change |
|---|---|
| `src/lib/db/races.ts` | Add `rdName`, `rdPhone`, `rdEmail`, `raceWebsiteUrl` to Race type |
| `src/app/api/admin/races/[raceId]/route.ts` | Accept and write the four new fields |
| `src/app/api/races/from-library/route.ts` | Explicit Race Facts copy; add classification comment block |
| `src/app/(app)/admin/race-library/new/page.tsx` | Add "Race Director & Website" form section |
| `src/app/(app)/admin/race-library/[raceId]/edit/page.tsx` | Add "Race Director & Website" form section |
| `src/app/crew/[token]/page.tsx` | Render RD contact block in header |
| `docs/specs/database.md` | Add data classification table; add new fields to Race record shape |
