# System Spec: Race Creation
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

Race creation (`/dashboard/new`) is a client-side form that collects the minimum information needed to set up a race: a GPX source, race name, date, start time, and timezone. On submit, it POSTs to `/api/races` and redirects to the race setup page (`/dashboard/<raceId>/setup`).

GPX can be provided in two ways:
- **Upload:** Drag-and-drop or file picker for a `.gpx` file. The file is parsed client-side immediately on drop/select to validate it and show a preview (track point count, waypoint count). If parsing fails, an error is shown and the form cannot be submitted.
- **Curated library:** A list of pre-loaded races defined in `src/data/curated-races/index.ts`. Selecting a race fetches its GPX file from the public assets path, parses it, and pre-fills the race name.

Both paths produce a `gpxString` that is sent to the API as part of the POST body. The API stores it (compressed) on the Race record in DynamoDB and immediately parses it to extract aid stations, which are saved as separate AidStation records.

Race name is auto-populated from the GPX filename (with hyphens/underscores replaced by spaces) when a file is uploaded directly, but remains editable.

## What it does not do

- Does not support editing an existing race's GPX. Once a race is created, its GPX is fixed. Aid station metadata (flags, names) can be edited on the setup page, but re-uploading a different GPX requires deleting and recreating the race.
- Does not validate the timezone field — any string is accepted. Invalid timezones will silently fail in weather fetches.
- Does not support batch race creation.
- Does not infer the race date or start time from the GPX file (some GPX files include timestamps on track points that could be used for this).

## Key files

| File | Role |
|---|---|
| `src/app/dashboard/new/page.tsx` | Client component: form, GPX drag-and-drop, curated library selector |
| `src/app/api/races/route.ts` | POST handler: validates input, creates Race record, parses GPX, saves aid stations |
| `src/data/curated-races/index.ts` | Static list of curated races with GPX asset paths |

## Data flow

```
User uploads GPX / selects curated race
  → client-side parseGPX() (validation + preview only)
  → POST /api/races { name, date, startTime, timezone, gpx }
    → server-side parseGPX() + extractAidStations()
    → createRace() → DynamoDB
    → saveAidStations() → DynamoDB
  → redirect to /dashboard/<raceId>/setup
```

## Notes for future development

- Timezone input is a plain text field — a timezone picker (or auto-detection from GPX coordinates via a reverse geocoding call) would reduce input errors and improve UX.
- Supporting GPX re-upload on an existing race would require deleting existing aid stations and re-running the extraction pipeline. The cascade delete issue noted in the database spec would apply here.
- The curated race library is currently a static TypeScript file. Sourcing this from DynamoDB (or a CMS) would allow adding races without a code deploy.
