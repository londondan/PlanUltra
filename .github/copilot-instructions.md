# PlanUltra — Copilot Instructions

## Project Overview

**PlanUltra** is a Next.js-based web application that helps ultramarathon runners plan races by analyzing GPX course files, displaying interactive maps, and forecasting weather along the race timeline. The app uses NextAuth for authentication, Tailwind CSS for styling, and DynamoDB for persistence.

**Core Phase 1 features:**
- Google OAuth sign-in
- GPX file upload or selection from race library
- Interactive course map (Mapbox GL)
- Aid station parsing and confirmation
- Weather forecasts anchored to race timeline
- Pace-based arrival time estimation

See `docs/PRD.md` for full product requirements and roadmap.

---

## Development Setup

### Prerequisites
- **Node.js**: Version 20+ (with pnpm package manager)
- **Java**: Required for local DynamoDB

### Initial Setup
```bash
pnpm install
```

### Environment Variables
Copy `.env.example` and configure:
```bash
cp .env.example .env.local
```

Required for development:
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — Set to `http://localhost:3000` locally
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — From Google OAuth console (optional for local dev if using dummy values)
- `DYNAMODB_ENDPOINT` — Set to `http://localhost:8000` when using local DynamoDB
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox API token for map rendering

### Database Setup
Local development uses DynamoDB Local. To start it:
```bash
pnpm run db:start
```

This script:
1. Starts DynamoDB on port 8000
2. Creates the `PlanUltra` table via `scripts/create-local-table.mjs`
3. Runs indefinitely; press Ctrl+C to stop

**First run?** Download DynamoDB Local:
```bash
mkdir -p local/dynamodb && curl -o local/dynamodb/dynamodb_local.tar.gz https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz && tar -xzf local/dynamodb/dynamodb_local.tar.gz -C local/dynamodb && rm local/dynamodb/dynamodb_local.tar.gz
```

---

## Build, Test, and Lint Commands

### Development Server
```bash
pnpm run dev
```
Starts Next.js dev server on `http://localhost:3000` with hot reload.

### Production Build
```bash
pnpm run build
pnpm run start
```

### Type Checking
```bash
pnpm run typecheck
```
Runs TypeScript compiler without emitting files.

### Testing
```bash
pnpm run test              # Run full test suite once
pnpm run test:watch       # Run tests in watch mode with auto-reload
```

Tests use **Vitest** configured with:
- `jsdom` environment for DOM testing
- `@testing-library/react` for component testing
- Path alias `@/*` → `src/*`
- Setup file: `vitest.setup.ts`

**Run a single test file:**
```bash
pnpm run test -- src/app/api/races/__tests__/races.test.ts
```

**Run tests matching a pattern:**
```bash
pnpm run test -- --grep "aid station"
```

### Linting
```bash
pnpm run lint
```

Uses ESLint with Next.js and TypeScript presets. Config file: `eslint.config.mjs`.

---

## Key Architectural Patterns

### Authentication Flow
- **Provider:** NextAuth 5.0 (beta) with Google OAuth
- **Config:** `src/app/api/auth/[...nextauth]/route.ts`
- **Middleware:** `src/middleware.ts` handles protected routes
- **Session:** User context available via NextAuth hooks

### Database / Data Access
- **Store:** AWS DynamoDB (local development via DynamoDB Local)
- **Client:** AWS SDK (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- **Initialization:** `src/lib/db.ts` exports `docClient` and `TABLE_NAME`
- **Data layers:**
  - `src/lib/db/races.ts` — Race CRUD operations
  - `src/lib/db/aid-stations.ts` — Aid station helpers

**Pattern:** All DB operations go through typed helper functions in `src/lib/db/`. No raw queries in API routes or components.

### Routing Structure
Next.js App Router (not Pages Router). Route groups and dynamic segments are used extensively:
- `/app` — Main routes (home, dashboard)
- `/app/dashboard/[raceId]` — Race detail pages
- `/app/api/races/[raceId]` — API endpoints
- `/app/auth/signin` — Auth page

### UI Components & Styling
- **Framework:** Tailwind CSS 4 (latest PostCSS integration)
- **Component Library:** shadcn/ui (base UI components in `src/components/ui/`)
- **Icons:** Lucide React
- **Custom Components:** In `src/components/` alongside UI folder
- **Styling Utility:** `src/lib/button-variants.ts` for reusable component variants using CVA (class-variance-authority)

**Pattern:** Prefer composable component patterns; use CVA for variant management.

### GPX and Geospatial
- **GPX Parsing:** `src/lib/gpx-parser.ts` — Parses GPX files to extract route and waypoints (aid stations)
- **Geospatial Utils:** `src/lib/geo-utils.ts` — Distance calculations, coordinate manipulation
- **Map Rendering:** Mapbox GL with token from `NEXT_PUBLIC_MAPBOX_TOKEN`

**Convention:** Aid station waypoints in GPX files are identified by name; the parser extracts these automatically.

### Pace and Arrival Time Estimation
- **Pace Calculator:** `src/lib/pace-calculator.ts` — Single-responsibility function that converts pace + distance to time
- **Design:** Kept isolated so Phase 2 elevation-aware models can replace it without touching other code

### Weather Integration
- **Source:** Open-Meteo (free, open-source, no API key required)
- **Client:** `src/lib/weather-client.ts` — Fetches hour-by-hour forecasts
- **Timeline Generator:** `src/lib/weather-timeline.ts` — Maps forecasts to race timeline and aid stations

**Important:** Weather is presented honestly; no false precision at long forecast horizons.

---

## Code Conventions

### File Organization
- **Components:** Colocate related files (`.tsx` + `.test.tsx` in same directory)
- **Utilities:** Pure functions live in `src/lib/` with `.test.ts` siblings
- **API Routes:** Mirror URL structure; keep business logic in lib, keep routes thin
- **Types:** Centralized in `src/types/` (e.g., `gpx.ts` for GPX-related types)

### Naming
- **Files:** kebab-case (e.g., `pace-calculator.ts`, `aid-stations.ts`)
- **Components:** PascalCase (e.g., `PaceInput.tsx`)
- **Functions/Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE for true constants

### TypeScript
- **Strict mode:** Always enabled (`"strict": true` in `tsconfig.json`)
- **No `any`:** Avoid unless absolutely necessary; use `unknown` + type guards or generics
- **Path aliases:** Use `@/` prefix (e.g., `import { Button } from '@/components/ui/button'`)

### Testing
- **Location:** Test files live next to source files as `.test.ts` or `.test.tsx`
- **Approach:** Unit tests for pure functions; integration tests for API routes and components
- **Matchers:** Use `@testing-library/react` for DOM assertions; `vitest` for mocks

### Git Commits
Include the following trailer in all commit messages:
```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## Common Tasks

### Add a New API Endpoint
1. Create file in `src/app/api/[path]/route.ts`
2. Implement typed handler: `export async function GET/POST(request) { ... }`
3. Use `docClient` from `src/lib/db.ts` for data access
4. Return JSON responses with appropriate status codes
5. Add tests in `__tests__/` directory alongside route

### Add a New Component
1. Create `src/components/YourComponent.tsx` (PascalCase)
2. If UI component, store in `src/components/ui/` and use shadcn/ui patterns
3. Create `.test.tsx` alongside it
4. Use `@/` imports for internal paths

### Update Database Schema
1. Modify `scripts/create-local-table.mjs` to reflect new table structure
2. Update helper functions in `src/lib/db/*.ts`
3. Restart local DynamoDB: `pnpm run db:start`

### Add Environment Variables
1. Add to `.env.example` with description
2. Add to `.env.local` with actual value
3. Reference in code via `process.env.VAR_NAME`
4. For public vars (frontend), prefix with `NEXT_PUBLIC_`

---

## Debugging Tips

### Inspect Local DynamoDB
Use a GUI tool like **DynamoDB Admin**:
```bash
npm install -g dynamodb-admin
export AWS_REGION=us-east-1 AWS_ENDPOINT=http://localhost:8000
dynamodb-admin
# Opens at http://localhost:8001
```

### Check Active Sessions
Inspect NextAuth session and logs:
- Check `NEXTAUTH_SECRET` is set and consistent across restarts
- Browser dev tools → Cookies → Check for `authjs.session-token`

### Type Errors During Development
TypeScript checking happens at build and via:
```bash
pnpm run typecheck
```
Use it liberally to catch issues early.

### Test Failures
- Run with `--reporter=verbose` for detailed output
- Add `console.log()` in tests; Vitest prints it on failure
- Use `test.only()` to isolate a single test

---

## Workspace Structure (pnpm)

This is a monorepo root using pnpm workspaces. Currently, all code lives in the root workspace; the `pnpm-workspace.yaml` file allows future expansion to multiple packages if needed.

```bash
pnpm add <package>              # Add to root workspace
pnpm add <package> -w           # Add as workspace dependency
```

---

## Performance Considerations

- **Mapbox:** Loaded lazily on map pages; use dynamic imports for non-critical code
- **Weather Fetches:** Cached where possible; avoid repeated calls for same race/date
- **Database:** DynamoDB queries are fast for small result sets; add pagination if needed
- **Build Size:** Tree-shake unused Tailwind classes with proper CSS purge config

---

## Known Limitations & TODOs

- **Elevation Awareness:** Phase 1 uses flat-ground pace estimation; Phase 2 will add grade-adjusted models
- **Live Updates:** Race-day actual arrival tracking is Phase 3
- **Race Library:** Pre-loaded races are a convenience layer; GPX upload is the primary path
- **Weather Precision:** Forecasts beyond 10 days are low-confidence; product is honest about this

---

## MCP Servers

### Playwright (Recommended)
For browser automation and end-to-end testing of map interactions, authentication flows, and race planning workflows. If not already configured, add to your Copilot CLI config:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "npm",
      "package": "@mcp/server-playwright"
    }
  }
}
```

This enables Copilot to:
- Automate browser testing of Mapbox map rendering
- Test form submissions and auth flows
- Validate GPX upload workflows
- Inspect DOM and network requests during development

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **NextAuth:** https://next-auth.js.org
- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com
- **Mapbox GL JS:** https://docs.mapbox.com/mapbox-gl-js
- **AWS SDK for JavaScript:** https://docs.aws.amazon.com/sdk-for-javascript
- **Open-Meteo API:** https://open-meteo.com/en/docs
- **Vitest:** https://vitest.dev
- **Playwright Docs:** https://playwright.dev
