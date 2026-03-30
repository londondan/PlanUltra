# PlanUltra

Free race planning for first-time 100-mile ultrarunners.

https://planultrarace.com/

A founder-built ultramarathon planning tool that helps runners turn GPX files, aid stations, pacing, weather, and crew logistics into one usable race-day plan. PlanUltra is especially focused on first-time 100-mile runners who want a clearer plan before race week.

---

## What it does

Ultra marathon planning is fragmented. Runners piece together information from race websites, PDFs, spreadsheets, and word of mouth. PlanUltra pulls it into one place:

- **Course map** — upload a GPX file and immediately see an interactive map with your route and aid stations pinned and labelled
- **Aid station table** — distances from start, leg distances, drop bag and crew access flags, and estimated arrival times at every stop
- **Loop course support** — detects out-and-back and loop courses automatically; repeated aid station visits each get their own row in the pace table
- **Weather forecast** — hour-by-hour forecast anchored to your race timeline, so you know what conditions to expect at each point on course
- **Pace calculator** — enter a flat pace or target finish time and get projected arrival times at every aid station

The goal is simple: turn a GPX file and a race date into a complete race-day plan your crew and future self can actually use.

---

## Screenshots

_Coming soon._

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth v5 (Google OAuth) |
| Database | AWS DynamoDB |
| Maps | Mapbox GL JS |
| Weather | Open-Meteo (free, no API key required) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Testing | Vitest |
| Infrastructure | AWS CDK |

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- Java (required for DynamoDB Local)

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From the [Google Cloud Console](https://console.cloud.google.com/) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | From [Mapbox](https://mapbox.com) |
| `DYNAMODB_ENDPOINT` | Set to `http://localhost:8000` for local dev |
| `DYNAMODB_TABLE_NAME` | `PlanUltra` (default) |

### Set up local DynamoDB

First-time setup — download DynamoDB Local:

```bash
mkdir -p local/dynamodb
curl -o local/dynamodb/dynamodb_local.tar.gz \
  https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz
tar -xzf local/dynamodb/dynamodb_local.tar.gz -C local/dynamodb
rm local/dynamodb/dynamodb_local.tar.gz
```

Then start the database (runs on port 8000 and creates the table):

```bash
pnpm run db:start
```

### Run the dev server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

```bash
pnpm run dev          # Development server with hot reload
pnpm run build        # Production build
pnpm run start        # Run production build
pnpm run test         # Run test suite
pnpm run test:watch   # Tests in watch mode
pnpm run typecheck    # TypeScript type checking
pnpm run lint         # ESLint
pnpm run db:start     # Start DynamoDB Local + create table
```

---

## Project structure

```
src/
├── app/
│   ├── api/                  # API routes (races, aid stations, auth)
│   ├── dashboard/[raceId]/   # Race detail, setup, and planning pages
│   └── auth/                 # Sign-in page
├── components/               # Shared UI components
├── lib/
│   ├── gpx-parser.ts         # GPX parsing + multi-visit detection
│   ├── pace-calculator.ts    # Arrival time estimation
│   ├── weather-client.ts     # Open-Meteo integration
│   ├── weather-timeline.ts   # Weather anchored to race timeline
│   ├── geo-utils.ts          # Haversine distance, cumulative distances
│   └── db/                   # DynamoDB data access helpers
├── types/                    # Shared TypeScript types
infra/                        # AWS CDK stack
scripts/                      # Local dev utilities
```

---

## Roadmap

### Phase 1 — Complete ✅

The core planning workflow is fully functional:

- [x] Google OAuth sign-in
- [x] GPX file upload with automatic aid station parsing
- [x] Loop course detection — repeated aid station visits each appear in the pace table
- [x] Start / Finish auto-detection and labelling
- [x] Interactive course map with aid station pins
- [x] Aid station setup — confirm drop bags and crew access per location
- [x] Flat-rate pace input or target finish time
- [x] Per-station estimated arrival times
- [x] Multi-day weather forecast anchored to race timeline

### Phase 2 — Planned

| Feature | Description |
|---|---|
| Grade-adjusted pace model | Upgrade pace estimation to account for elevation gain/loss (Naismith's Rule or similar); isolated function design means all downstream features update automatically |
| Per-station gear & nutrition planner | Drop bag contents planner per station; night gear flagged automatically when estimated arrival falls after dark |
| Crew calendar events | Auto-generate Google Calendar events for crew at accessible stations, keyed to estimated arrival windows |
| Manual mid-race updates | Runner or crew updates actual arrival times; downstream estimates and calendar events cascade |
| Race library growth | Automated sourcing of GPX files for known races |

### Phase 3 — Future

| Feature | Description |
|---|---|
| Race tattoo generator | Print-ready forearm tattoo showing elevation profile, aid stations, and estimated arrival times — download or order via print-on-demand |
| Crew accommodation finder | Map of hotels and Airbnbs near crew-accessible stations to help crew choose a base of operations during a 24–30 hour race |

---

## Contributing

This is a personal project but issues and pull requests are welcome. If you're planning a larger change, open an issue first to discuss it.

---

## License

MIT
