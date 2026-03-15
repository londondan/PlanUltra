# System Spec: Database
**Last updated:** 2026-03-15
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

Both access patterns map to a single primary key query — no GSI is currently needed.

## What it does not do

- Does not use DynamoDB Streams or triggers.
- Does not have TTL configured on any items.
- Does not store session data (auth sessions are stateless JWTs).
- Does not have a migrations system — schema changes must be handled manually or via a one-off script.
- Does not enforce referential integrity. Deleting a race does not cascade-delete its aid stations; `deleteRace` in `db/races.ts` must be paired with `deleteAidStations` in `db/aid-stations.ts` at the application layer.

## Key files

| File | Role |
|---|---|
| `src/lib/db.ts` | DynamoDB client and table name constant |
| `src/lib/db/races.ts` | CRUD for Race records; GPX compression/decompression |
| `src/lib/db/aid-stations.ts` | Batch write, query, update, and delete for AidStation records |

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
  createdAt: string      // ISO 8601
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

## Notes for future development

- The `elevationGain` field exists on aid station records but is always written as `0`. It is reserved for the Phase 2 grade-adjusted pace model.
- `gpxUrl` is defined in the Race type but not populated by any current code path. It was intended for storing GPX as an S3 URL rather than inline — this would be necessary if GPX files routinely exceed the compressed DynamoDB item limit.
- Cascade deletes are not handled automatically. Any feature that deletes a race must also call `deleteAidStations`.
- Aid station `SK` uses zero-padded order (`AID#0001`, `AID#0002`, ...) to ensure DynamoDB returns them in order on a range query. If order values ever exceed 9999, padding will need to be widened.
