# System Spec: Race Setup (Aid Station Configuration)
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

The setup page (`/dashboard/<raceId>/setup`) is the step immediately after race creation. It presents the aid stations parsed from the GPX file and lets the runner review and configure them before proceeding to the race detail view.

The page shows one row per unique physical location (stations that are visited multiple times on the course — e.g. out-and-back stations — appear as a single row showing all their distances from start). Editable fields per row are: name, drop bag flag, and crew access flag. Start and Finish rows are non-editable (locked) since they are always flagged as crew-accessible with drop bag availability.

The runner can also add stations manually (useful when the GPX has no waypoints) and delete stations that were incorrectly parsed. Adding a station manually creates a record with `lat: 0`, `lon: 0`, and `distanceFromStart: 0` — distances must be entered manually (this is a known limitation of the current UI).

On save, the full list of stations (all visits, not just unique locations) is PUT to `/api/races/<raceId>/aid-stations`, which replaces the existing aid station records in DynamoDB.

Distance display toggles between miles and km via buttons in the page header.

## What it does not do

- Does not allow reordering stations or editing their distances from start (except by deleting and re-adding). Distance is fixed at parse time from the GPX.
- Does not support editing the race name, date, start time, or timezone from this page — those fields are set at creation and cannot currently be changed.
- Does not validate that manually added stations have valid coordinates or distances.
- Does not show elevation data per station.
- Does not support the "packer view" or "crew view" — those are planned future screens that will consume this configuration.

## Key files

| File | Role |
|---|---|
| `src/app/dashboard/[raceId]/setup/page.tsx` | Client component: editable station table, save flow |
| `src/app/api/races/[raceId]/aid-stations/route.ts` | GET (load stations) and PUT (replace all stations) |

## Data flow

```
Page load
  → GET /api/races/<raceId>/aid-stations
  → Render all AidStation records, grouped by physicalName for the UI

User edits flags / names / adds / removes stations

Save
  → PUT /api/races/<raceId>/aid-stations { aidStations: [...all visits...] }
    → deleteAidStations() removes existing records
    → saveAidStations() writes full replacement set
  → redirect to /dashboard/<raceId>
```

## Notes for future development

- The "packing view" and "crew view" both depend on the configuration set here (drop bag flags and crew access flags). Those views should be built to read from the existing `AidStation` records rather than requiring the runner to re-enter data.
- Allowing inline distance editing would be valuable for manually-added stations, but requires re-sorting the station list and re-numbering `order` values.
- A future enhancement could allow the runner to drag-and-drop waypoints on the course map to set their coordinates for manually-added stations.
