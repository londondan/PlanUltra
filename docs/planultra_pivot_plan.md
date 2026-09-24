# PlanUltra — Product Pivot Plan
**Date:** 2026-05-02  
**Status:** Draft for review  

---

## 1. Current State

### What exists

PlanUltra is a Next.js web app with Google OAuth, backed by a single-table DynamoDB design. The core loop is functional: a runner signs in, creates a race (either by uploading a GPX file or selecting from a small admin-curated race library), confirms aid station configuration, sets a target pace, and views a course map, aid station table, and weather forecast. The crew sheet feature is also shipped — the runner can publish a shareable URL their crew can open without an account.

The race library is manually maintained: the admin (you) uses a gated UI at `/admin/race-library` to add races by uploading a GPX, filling in metadata, and configuring per-station parking/location data. There's an extraction utility (`docs/utils/extract_race.py`) that pipelines a GPX + race packet PDF through Claude to produce structured JSON, but the final import step is still manual. Only a handful of races are in the library.

Several significant PRDs are in draft but unimplemented: the aid station setup flow rewrite (PRD-026), race data model split formalising Race Facts vs Runner Plan (PRD-027), and GPX coord auto-fill from waypoints (PRD-025). The guest/unauthenticated flow (PRD-014) has been specced but not built. There is also a well-developed backlog item for a public crew template URL per library race — a no-auth page showing race facts only, with a CTA to personalise it.

### Activation state

As of May 2026, signup count is 2 with zero activated planners (per `tracking/latest-metrics.json` and `activation-log.md`). The current homepage (PRD-023) positions the crew sheet as the hero artifact, which is a strong idea, but the fundamental conversion funnel requires sign-in before touching the product. There is no way to experience PlanUltra without creating an account.

### Tech stack summary

- Framework: Next.js (App Router), TypeScript
- Auth: NextAuth, Google OAuth, stateless JWTs
- Database: DynamoDB single-table design
- Hosting: AWS (implied by DynamoDB)
- Maps: Mapbox (crew travel/directions)
- Weather: Open-Meteo (free tier)
- Key external dependencies: `qrcode` npm package for crew sheet QR codes

### Existing strategic tension

The original PRD (v0.4) explicitly warns against becoming a race database and says race library races are "a convenience layer, not the core." The pivot described here moves in the opposite direction — the race library becomes a primary growth surface. That tension is worth naming and resolving: the library only works as a growth lever if it's kept current and contains races people actually want. That is a content operations commitment, not just a technical one.

---

## 2. Strategic Rationale for the Pivot

### The core problem with the current funnel

Every entry point to PlanUltra requires account creation before the user can see anything of value. This is a classic "show me the goods after you give me your email" pattern. In the ultra running community — which has already been primed to be sceptical of "AI slop vibe-coded apps" (per the competitive teardown) — asking for a Google sign-in before demonstrating value is a significant conversion killer.

The current activation bar is also high: sign in → create a race → confirm aid stations → reach the planner. That's three to five intentional steps before the product becomes useful. Nobody will complete that journey unless they're already motivated, and motivated prospects are rare at this stage.

### The insight

The pivot starts from a different question: what if the first thing a user sees is a complete, useful race object — not a blank form?

A library race already contains everything a prospective user wants to see: the course, the aid stations, the distances, the parking locations, the crew notes. If that object were publicly accessible with no account required, a user could arrive at PlanUltra via a Google search for "Western States 100 aid station crew plan," see exactly what the product does, and have a concrete reason to create an account: to personalise *this specific plan* for themselves.

This flips the funnel. Instead of: *create account → build race from scratch → see value*, it becomes: *find race → see value immediately → create account to claim it*.

The backlog already contains the seed of this idea (the "shareable race-only crew template" item added 2026-04-18). This pivot expands that seed into a four-phase programme.

### Why this is the right move now

- **Zero activated users means the current funnel isn't working.** There's no acquisition data to suggest doubling down on it.
- **The race library already exists** as a data asset. Making it publicly accessible is a relatively low-effort unlock.
- **UltraPacer doesn't do this.** UltraPacer is the only recognised competitor, and it produces a pacing table, not a crew-usable document. A public race view that shows a rich, printable crew-oriented page is differentiated.
- **SEO upside is real.** A public page per race (e.g. `/races/western-states-100`) is indexable. Runners search for "[race name] aid stations" and "[race name] crew guide" regularly. There is no good answer to those searches today.
- **The hook is specific and credible.** "Add your personal plan to this sheet" is a much more compelling CTA than "sign up for a planning tool." The user can see exactly what they're getting.

---

## 3. The Four Phases

---

### Phase 1 — Race Library Automation

**Goal:** Remove the manual bottleneck on race library growth so the library can scale to dozens or hundreds of races without per-race admin time.

#### What this is

Today, adding a race to the library requires: find a GPX, find the race packet, run `extract_race.py`, review the JSON, import via the admin UI, verify parking coords. This takes 30–60 minutes per race if everything goes well. At that rate, the library won't grow fast enough to make the public race view (Phase 3) useful.

Phase 1 automates the data sourcing — finding and ingesting GPX files, parking data, and race metadata — so that the human review step is the bottleneck, not the data gathering.

#### Key technical decisions

**GPX sourcing.** Most race GPX files are either linked from the race website, posted to Ultrasignup, or available via community repositories (e.g. Fastest Known Time, various Strava segments). The automation layer should: (a) maintain a watchlist of target races, (b) periodically check known URLs for GPX availability, and (c) flag new/updated files for human review rather than auto-importing without oversight. The existing `extract_race.py` utility already handles the Claude-assisted extraction step — this phase wraps it in a scheduler and a data pipeline.

**Parking and crew access data.** This is harder than GPX. Parking data comes from race runner's guides (PDFs), race websites, and community knowledge. The extraction utility already attempts to pull parking notes from PDFs. The gap is that `crewParkingCoords` often needs manual verification even when auto-filled from waypoints (per PRD-025). Phase 1 should optimise for *flagging* rather than *auto-confirming* — populate what can be populated automatically, and surface a clear "N stations unverified" count to the admin.

**Automation mechanism.** A cron job or scheduled task (the `schedule` skill is available) running against a YAML/JSON watchlist of target races. Each run produces a diff: new GPX available, race metadata changed, etc. The admin reviews and approves; the actual import still uses the existing admin UI pipeline.

**Race candidates list.** `docs/requirements/race-library-candidates.md` already exists — this becomes the input manifest for the automation.

#### Open questions

- Should GPX scraping be fully automated (fetch + extract) or semi-automated (fetch only, human runs extraction)? The latter is safer and still saves most of the time.
- How do you handle races that update their GPX year-over-year (new route, new aid stations)? Need a versioning or re-ingest trigger.
- What's the target library size before Phase 3 launches? Suggest a minimum of 20–30 races across different US regions and distance categories before going public.
- Does automation create any legal exposure around scraping race websites? Worth checking terms of service for Ultrasignup and key race sites before building scrapers.

#### Dependencies

- Existing `extract_race.py` utility (done)
- PRD-025 (GPX coord auto-fill) — should be implemented as part of this phase since it reduces manual verification load
- Admin UI (PRD-012, PRD-024) — should be in a solid state before adding more races

---

### Phase 2 — PlanUltra API

**Goal:** Create a clean, versioned internal API for race library data that decouples the race object from the DynamoDB implementation detail and serves as the foundation for the public race view and any future external integrations.

#### What this is

Currently, race data is accessed via a patchwork of Next.js API routes: `/api/races`, `/api/admin/races`, `/api/library/races/[raceId]`, etc. These are app-internal routes tied to the current data model and auth structure. They were not designed to be public endpoints.

Phase 2 creates a proper `GET /api/v1/races` and `GET /api/v1/races/[slug]` surface that: (a) is publicly accessible for library races, (b) returns a stable, documented shape, and (c) handles the Race Facts / Runner Plan split cleanly (only Race Facts are exposed publicly).

#### Key technical decisions

**Slug vs UUID for public URLs.** The current race library uses UUIDs (`raceId`). Public-facing URLs should use human-readable slugs (e.g. `western-states-100`, `grindstone-100`). Add a `slug` field to the Race record. Slugs are set by the admin, must be unique, URL-safe, and immutable once set (changing them breaks external links). This is a one-time addition to the admin form.

**What the public API returns.** Race Facts only: name, date, startTime, timezone, location, libraryDescription, rdName/Phone/Email/raceWebsiteUrl, startLat/startLon, and the full aid station list (including crewParkingCoords, crewParkingType, crewLocationNotes). No Runner Plan fields. No gpxData in the public response (it's large and not needed for display).

**Rate limiting and caching.** Public endpoints need rate limiting. The simplest approach is a CDN cache (CloudFront or similar) with a short TTL (e.g. 5 minutes) in front of the API. This also handles the SEO case — crawlers can access the data without hammering DynamoDB.

**Authenticated write API.** Phase 2 can also formalise the write-side: `POST /api/v1/races` (admin only) for creating library races, which is currently done via the UI. This isn't strictly necessary for Phase 3 but makes the system more coherent and enables future automation (Phase 1's pipeline could eventually write directly via the API rather than through the admin UI).

**PRD-027 dependency.** The Race Facts / Runner Plan split (PRD-027) should be implemented before or alongside Phase 2. The public API should only ever return Race Facts — having a formal boundary in code makes that guarantee enforceable.

#### Open questions

- Is a formal versioned API (`/api/v1/`) necessary now, or is it premature for a hobby project? The slug requirement and public exposure justify at least a stable contract, even if versioning is informal.
- Should the API be documented (OpenAPI spec)? Probably not for Phase 2 — only worth documenting if external developers are expected to use it.
- DynamoDB doesn't support slug-based lookup natively without a GSI. Either add a GSI on the slug field, or maintain a slug→raceId lookup table. GSI is cleaner.

#### Dependencies

- PRD-027 (Race Facts / Runner Plan split) — should be done first
- Admin UI must support slug input
- Phase 1 library growth — more races in the library make the API more useful

---

### Phase 3 — Public Race View

**Goal:** Make every library race publicly accessible at a stable URL with no account required, delivering immediate value and functioning as the primary acquisition surface.

#### What this is

A new route — `/races/[slug]` — renders a rich, read-only view of a library race. Anyone can reach it: from Google, from a Reddit comment, from a race director sharing a link. No sign-in required. No banner asking them to sign in (beyond the hook CTA described in Phase 4).

This is the most strategically important phase. It is what turns the race library from an internal convenience into a public growth asset.

#### What the page shows

The page should show everything a crew member or runner would want to see before race day:

- Race name, date, location, distance
- Full course map (the existing Mapbox map component, rendered with the race GPX)
- Aid station table: mile markers, distances between stations, crew access flags, drop bag flags
- Crew parking locations and notes (where available)
- Race director contact info
- A link to the official race website

It should be fast, printable, and mobile-friendly. It should feel like the best free crew guide for this race that exists anywhere online.

**What it deliberately does not show:** pacing, arrival time estimates, gear or nutrition plans, weather. Those are Runner Plan features. Their absence is the hook (see Phase 4).

#### SEO and discoverability

Each race page should have: a descriptive `<title>` and `<meta description>` (e.g. "Western States 100 — Aid stations, crew access, and parking guide"), structured data (Schema.org `Event`), and a canonical URL. Page content should be server-rendered (not client-fetched) for crawlability.

The value proposition for SEO is strong: there is no good, structured, freely indexable page for "[race name] aid station crew guide" for most ultras. PlanUltra can own that search intent.

#### URL scheme

`/races/[slug]` for the public view. Keep `/dashboard/[raceId]` for the authenticated runner's personal view. These are distinct routes — one is a public race reference page, the other is a personalised planning workspace.

**Also worth considering:** a redirect from `/races/[slug]` to the runner's own plan for that race if they're already logged in and have created a race from this library entry. Avoids confusion between the generic page and their personalised version.

#### Key technical decisions

The page can be built as a Next.js server component fetching from the Phase 2 API (or directly from the DB layer). Static generation (`generateStaticParams`) is worth considering for performance, but dynamic rendering with a short cache TTL is simpler and handles race updates without a rebuild.

The existing crew sheet route (`/crew/[token]`) shows some of what's needed, but the public race view is structurally different: it's a race reference page, not a personalised plan. Don't reuse the crew sheet template for this — they serve different mental models.

#### Open questions

- Should the public race view show the GPX-derived elevation profile? This would make the page more useful but requires serving the GPX data or a derived elevation dataset on a public endpoint.
- How do you handle races that are past their date? A 2024 Western States page is still useful as a reference but shouldn't rank above the current year's entry. Consider either: (a) one page per race (not per year's edition), updated annually, or (b) date-stamped pages with the most recent marked canonical.
- Should anonymous users be able to access this page from the main nav? Add a "Race Library" link to the public nav (not just the authenticated app nav).

#### Dependencies

- Phase 2 API (stable public endpoint)
- Phase 1 library having enough races to make the directory meaningful
- PRD-025 (coord auto-fill) and PRD-024 (admin station config) — so race pages have useful parking data

---

### Phase 4 — The Hook: Personalise This Plan

**Goal:** Convert public race view visitors into authenticated, activated users by making account creation feel like claiming something already valuable, not starting from scratch.

#### What this is

At the bottom of every public race view (Phase 3), a persistent but non-intrusive CTA:

> **"This is your race? Build your personal plan →"**  
> Add your target pace, arrival times, drop bag contents, and crew notes. Share a single link with your crew.

Clicking this takes the user to the sign-in flow, pre-seeded with the library race ID. After OAuth, instead of landing on a blank dashboard, they land on a race that already exists — the course is mapped, the aid stations are configured, the parking locations are pre-filled. The only thing missing is their personal plan.

This is the key insight operationalised: the user is not being asked to create something. They are being invited to personalise something that already exists and already looks useful.

#### Why this works better than the current funnel

The current sign-in CTA asks the user to trust that the product will be worth the friction. The Phase 4 CTA shows them exactly what they're getting before they sign in. The race page demonstrates the product; the CTA converts demonstrated value into action.

The backlog item from 2026-04-18 describes this precisely: "a sticky footer CTA — 'Add your personal plan to this sheet →' — that links to the PlanUltra sign-up flow pre-seeded with this race."

#### Implementation: the pre-seeded sign-in flow

After OAuth completes, the NextAuth callback (or a post-OAuth redirect page) checks for a `?race=[libraryRaceId]` query parameter on the `/auth/signin` URL. If present and the library race exists, it calls `POST /api/races/from-library` automatically and redirects the user to `/dashboard/[newRaceId]` rather than the empty dashboard. The user's first experience of the authenticated app is their race — not a blank state.

This requires a small addition to the auth flow but is architecturally clean given the existing `from-library` endpoint.

#### What the onboarding moment looks like

User flow:
1. Arrives at `/races/western-states-100` via Google search
2. Reads the race page, sees their aid stations, sees crew parking info
3. Clicks "Build your personal plan →"
4. Signs in with Google (one click)
5. Lands on `/dashboard/[raceId]` — Western States is already there, aid stations pre-configured
6. Prompted to: set their target finish time, confirm drop bag stations, review crew notes
7. Within 5–10 minutes, they have a complete crew sheet ready to share

Compare this to the current flow where step 5 is "stare at an empty dashboard and figure out what to do."

#### The CTA design

The CTA should be persistent but not aggressive — a fixed footer bar on the race view page, not a modal or interstitial. Copy should be specific to the race: "Running Western States? Build your crew plan →" is better than a generic "Sign up." The specificity signals that sign-up gets them *this race*, not a generic tool.

For users who are already signed in, the CTA changes to "Add to my races →" which calls `from-library` immediately without the OAuth step.

#### Activation metric

Phase 4 is successful when the path from race page → activated planner (race created + aid stations confirmed + planner reached) has a meaningful conversion rate. Even 5–10% of race page visitors who click the CTA becoming activated planners would be a strong signal. Track: (a) CTA clicks, (b) sign-ins attributed to the CTA, (c) races created via `from-library` from the pre-seeded flow, (d) activation completions.

#### Open questions

- Should the pre-seeded race be created immediately at sign-in, or should the user be prompted to confirm first? ("We've pre-loaded Western States 100 for you. Confirm to add it to your dashboard.") The confirmation step reduces surprise but adds friction. Recommend auto-create with an undo option.
- How do you handle a user who signs in via this flow but already has an account? Don't auto-create a duplicate race — check if they already have a race from this library entry and redirect to it instead.
- Should the CTA be shown on the existing crew sheet route (`/crew/[token]`) as well? Crew members who arrive via a shared crew sheet are warm leads — they've already seen the product working for a real runner.

#### Dependencies

- Phase 3 (public race view must exist)
- Phase 2 (pre-seeded `from-library` flow needs a stable race ID)
- The existing `POST /api/races/from-library` endpoint (already implemented per the lifecycle spec)

---

## 4. Risks and Dependencies

### Content operations risk (Phase 1)

The race library becomes a primary growth surface, which means its quality and currency matter much more than they do today. A user who searches for "Hardrock 100 crew guide," lands on a PlanUltra race page, and finds stale or incomplete data will not sign up. This is a commitment to ongoing content maintenance, not just a one-time engineering project. The automation (Phase 1) reduces this burden but doesn't eliminate it — someone has to review flagged updates and verify parking locations before they're published.

**Mitigation:** Build the admin review queue before scaling the library. Prioritise races with high search volume and reliable GPX sources. Audit quality before going public with Phase 3.

### Strategic tension with the original PRD

The original PRD §4 explicitly says "Becoming a race database is a content operations problem, not a product problem." This pivot leans into the content operations problem intentionally. That's a defensible choice — owning the race data for popular ultras is a real moat — but it changes the product's nature. The GPX upload path should remain first-class even after Phase 3 ships; runners whose races aren't in the library should still have a great experience.

### Auth flow complexity (Phase 4)

The pre-seeded sign-in flow adds state to the OAuth callback, which is currently stateless. Query parameters passed through an OAuth redirect can be lost if the provider changes the callback URL (e.g. if a user uses a saved `/auth/signin` bookmark without the query param). The implementation needs to be robust to this: if the pre-seed param is missing on callback, fall back to the normal empty dashboard rather than erroring.

### GSI cost (Phase 2)

Adding a slug-based GSI to DynamoDB adds a small ongoing cost and write amplification. At current scale this is negligible, but worth noting for the record.

### UltraPacer competitive threat

Per the competitive teardown, UltraPacer has feature requests for printable crew cheat sheets and is the dominant brand in the "ultra planning" category. If they ship a public race view or crew-facing output before PlanUltra has real users and race library depth, the window narrows. The Phase 3 public race view is the most defensible position — owning indexed race pages is a structural advantage that's hard to replicate quickly.

### Phase ordering note

The phases are ordered by dependency, not necessarily by effort. Phase 2 (API) can be started in parallel with Phase 1 (automation) since they don't depend on each other. Phase 3 requires both to be substantially complete. Phase 4 requires Phase 3.

A reasonable parallel track: ship PRD-027 (Race Facts split) and the slug field (Phase 2 prerequisite) while the Phase 1 automation pipeline is being built. Then Phase 3 and 4 can follow quickly once the library has depth.

---

## 5. Summary Table

| Phase | Goal | Key output | Prerequisite |
|---|---|---|---|
| 1 — Automation | Grow library without manual overhead | Scheduled scraper + admin review queue | PRD-025, PRD-024 in good shape |
| 2 — API | Stable, public, documented race data surface | `GET /api/v1/races/[slug]`, slug field on Race record | PRD-027 (Race Facts split) |
| 3 — Public race view | Zero-friction first impression, SEO surface | `/races/[slug]` public page | Phases 1 + 2, 20+ library races |
| 4 — The hook | Convert visitors into activated planners | Pre-seeded sign-in → `from-library` auto-create | Phase 3 live |
