# PlanUltra Backlog

Low-priority items deferred from PRDs. Pick these up when the time is right.

---

## Runner Plan

### Shareable race-only crew template (no runner plan required)
**Added:** 2026-04-18
Generate a public, no-auth crew sheet from a library race using Race Facts only — aid stations, miles, parking coords, RD contact, race website. No runner-specific data (no ETAs, no drop bags, no crew notes). Useful as a standalone handout: an RD can share "here is a crew access template for this race" with all their runners, who can use it as-is or sign up to personalise it.

**Distribution angle:** Admin generates a stable public URL per library race (e.g. `/crew/template/[libraryRaceSlug]`). The RD gets that link and shares it with their field. The page has a sticky footer CTA — "Add your personal plan to this sheet →" — that links to the PlanUltra sign-up flow pre-seeded with this race. The CTA copy leans on specificity: the race name is in the prompt, making it clear the user gets *this* sheet personalised, not a generic planning tool.

**Key design decisions to resolve in a future PRD:**
- URL scheme: slug-based (`/crew/template/western-states-100`) vs token-based
- ETA column: omit entirely, or show blank/dashes with a "sign up to add your pace" prompt
- Whether the template is versioned (i.e. if the admin updates the library race, does the template URL reflect the update immediately)
- Print optimisation: this is likely the primary use case, so the no-runner-data layout needs to print cleanly without large blank sections

---

### Let runner mark which crew-accessible stations they'll have crew at
**Added:** 2026-04-18
**From:** PRD-027 §2.2
`hasCrewAccess` on the AidStation record is a Race Fact — set by the race organisation, copied from the library. The runner currently has no way to say "I have crew access at miles 43 and 62, but my crew is only meeting me at mile 62." Add a runner-controlled flag (e.g. `runnerHasCrew: boolean`) distinct from `hasCrewAccess`, defaulting to `true` for all crew-accessible stations. The runner can toggle individual stations off in the race setup or crew tab. The crew sheet should only show full crew cards for stations where `runnerHasCrew === true`.

### Let runner mark which drop-bag stations they're using
**Added:** 2026-04-18
**From:** PRD-027 §2.2
Similar to the crew station issue above. Drop bag availability is a Race Fact; whether the runner is using a drop bag at a given station is a Runner Plan decision. Currently `hasDropBag` conflates both. When the race-facts split matures, introduce a `dropBagAllowed` Race Fact field (set by admin) and keep `hasDropBag` as the runner's choice, defaulting to `true` for all drop-bag-allowed stations.

---

## Race Creation / Setup

### Lapped race support
**Added:** 2026-04-18
Allow a race to be defined as N loops of a single GPX. When a user uploads a GPX that represents one loop, they should be able to specify a lap count (e.g. "8 loops"). The system would then multiply out the sections, distances, and ETAs accordingly. Aid stations that repeat each lap need a sensible naming convention (e.g. "Start/Finish (Lap 3)"). Consider: do crew access flags apply per-lap or globally per station type? Likely global (if you crew at a station, you crew it every lap). Elevation and distance totals need to reflect the full lapped distance. This touches GPX processing, the aid station setup step (PRD-026), and the crew sheet.

### Port race setup tools to race library creation flow
**Added:** 2026-04-18
The user-facing race creation flow (PRD-026) has working GPX upload, aid station configuration, crew/no-crew toggles, and parking data entry. The admin race library creation/edit flow (PRD-012, PRD-024) should reach feature parity. Specifically, the library form needs:
- GPX upload with aid station auto-detection (partially covered by PRD-024)
- Per-station crew access toggle
- Per-station drop bag toggle
- Per-station parking info (coords, type, notes) — already in PRD-024 §2
- Per-station parking lot / location details (same as PRD-022 fields)
- Race director contact numbers (`rdPhone`, `rdEmail`) and race website URL (`raceWebsiteUrl`) — see crew sheet item above
When a user copies a library race, all of this pre-configured data carries over to their race, reducing setup friction.

---

## Admin

### Add admin user ID to env vars
**From:** PRD-021
Currently, excluding the admin account from race counts requires a runtime lookup of `danrjames@gmail.com` → its DynamoDB user ID. Add `ADMIN_USER_IDS` as a companion env var to `ADMIN_EMAILS` so the exclusion can be done without a DB lookup. Populate it once from the user store and set it in `.env.local` and the deployment environment.

### Optimise user table query with a GSI
**From:** PRD-021
The `/admin/users` endpoint currently uses a DynamoDB full table scan to list all users. Fine at <10 users, but will degrade at scale. When user count grows meaningfully, add a GSI on `createdAt` to support efficient paginated queries sorted by sign-up date.
