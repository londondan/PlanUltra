# System Spec: Database
**Last updated:** 2026-03-25
**Status:** Shipped

---

## What it does

Persistence is handled by a single AWS DynamoDB table (`PlanUltra` by default, configurable via `DYNAMODB_TABLE_NAME`). The table uses a single-table design with composite keys (`PK` + `SK`).

The client is initialised in `src/lib/db.ts` as a `DynamoDBDocumentClient` (the higher-level AWS SDK wrapper that handles marshalling). When `DYNAMODB_ENDPOINT` is set, the client connects to a local DynamoDB instance (used in development and tests).

GPX strings are gzip-compressed and base64-encoded before being written to DynamoDB, and decompressed on read. This keeps item sizes within DynamoDB's 400KB item limit for large GPX files.

## Access patterns

| PK | SK | Record type | Query pattern |
|---|---|---|---|
| `USER#<userId>` | `RACE#<raceId>` | Race | Get all races for a user; get single race by ID |
| `RACE#<raceId>` | `AID#<order padded to 4 digits>` | Aid station | Get all aid stations for a race; update a single station by order |
| `RACE#<raceId>` | `SECTION#<fromStationOrder padded to 4 digits>` | Section plan | Get all section plans for a race; upsert a single section plan |

All three access patterns map to single primary key queries — no GSI is currently needed.

## What it does not do

- Does not use DynamoDB Streams or triggers.
- Does not have TTL configured on any items.
- Does not store session data (auth sessions are stateless JWTs).
- Does not have a migrations system — schema changes must be handled manually or via a one-off script.
- Does not enforce referential integrity. Race deletion must cascade-delete all associated records (`AID#` and `SECTION#`) at the application layer — DynamoDB provides no automatic cascading. Any delete-race implementation must call `deleteAidStations` and `deleteSectionPlans` in the same operation.

## Key files

| File | Role |
|---|---|
| `src/lib/db.ts` | DynamoDB client and table name constant |
| `src/lib/db/races.ts` | CRUD for Race records; GPX compression/decompression |
| `src/lib/db/aid-stations.ts` | Batch write, query, update, and delete for AidStation records |
| `src/lib/db/section-plans.ts` | Upsert, query, and delete for SectionPlan records *(not yet created — PRD-002)* |

## Race record shape

```
{
  PK: "USER#<userId>",
  SK: "RACE#<raceId>",
  raceId: string,
  userId: string,
  name: string,
  date: string,          // YYYY-MM-DD
  startTime: string,     // HH:MM (24h)
  timezone: string,      // IANA timezone string, e.g. "America/Los_Angeles"
  gpxData?: string,      // gzip+base64 compressed GPX XML
  gpxUrl?: string,       // not currently used
  startLat?: number,
  startLon?: number,
  caloriesPerHour?: number,      // race-level default for drop bag planning (PRD-002)
  targetFinishMinutes?: number,  // runner's estimated finish time in minutes; persisted on pace entry
  createdAt: string              // ISO 8601
}
```

## Aid station record shape

```
{
  PK: "RACE#<raceId>",
  SK: "AID#<order>",     // order zero-padded to 4 digits for lexicographic sort
  order: number,
  name: string,
  physicalName: string,
  lat: number,
  lon: number,
  distanceFromStart: number,   // km
  distanceFromPrev: number,    // km
  elevationGain: number,       // currently always 0
  hasDropBag: boolean,
  hasCrewAccess: boolean,
  isStart?: boolean,
  isFinish?: boolean,
  visitNumber: number
}
```

## Section plan record shape

*(Planned — PRD-002. Not yet implemented.)*

```
{
  PK: "RACE#<raceId>",
  SK: "SECTION#<fromStationOrder>",  // fromStationOrder zero-padded to 4 digits
  raceId: string,
  fromStationOrder: number,
  fromStationName: string,
  toStationName: string,
  drinkMixes: number | null,
  caloriesOverride: number | null,   // overrides race-level caloriesPerHour for this section
  hasHeadlamp: boolean,
  hasExtraLayer: boolean,
  hasRainGear: boolean,
  hasPoles: boolean,
  shoeChange: boolean,
  notes: string,
  updatedAt: string                  // ISO 8601
}
```

## Notes for future development

- The `elevationGain` field exists on aid station records but is always written as `0`. It is reserved for the Phase 2 grade-adjusted pace model.
- `gpxUrl` is defined in the Race type but not populated by any current code path. It was intended for storing GPX as an S3 URL rather than inline — this would be necessary if GPX files routinely exceed the compressed DynamoDB item limit.
- Race deletion must cascade to `AID#` and `SECTION#` records. Any delete-race implementation must call all three deletes. Failure to do so leaves orphaned records that consume table capacity and will re-surface if a new race is ever created with the same ID (UUIDs make this astronomically unlikely but the principle stands).
- Aid station and section plan `SK` values use zero-padded order numbers (`AID#0001`, `SECTION#0001`, ...) to ensure DynamoDB returns them in lexicographic order on a range query. If order values ever exceed 9999, padding will need to be widened consistently across both record types.
- The `caloriesPerHour` field on the Race record is a race-level default added for PRD-002. It is optional and nullable — existing race records without this field should be treated as "not set" rather than zero.
