/**
 * One-off script to flush all library races from production DynamoDB.
 *
 * Usage:
 *   # Dry run (no writes)
 *   AWS_REGION=us-east-1 DYNAMODB_TABLE_NAME=PlanUltra node scripts/flush-library.mjs --dry-run
 *
 *   # Live run (destructive)
 *   AWS_REGION=us-east-1 DYNAMODB_TABLE_NAME=PlanUltra node scripts/flush-library.mjs
 *
 * AWS credentials must be available via env vars or an active SSO session.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'

const DRY_RUN = process.argv.includes('--dry-run')
const TABLE = process.env.DYNAMODB_TABLE_NAME ?? 'PlanUltra'
const LIBRARY_PK = 'USER#__LIBRARY__'

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })

if (DRY_RUN) {
  console.log('[DRY RUN] No writes will be performed.\n')
}

// ── helpers ──────────────────────────────────────────────────────────────────

function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function queryAll(pk, skPrefix) {
  const items = []
  let lastKey
  do {
    const result = await db.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': skPrefix },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      })
    )
    items.push(...(result.Items ?? []))
    lastKey = result.LastEvaluatedKey
  } while (lastKey)
  return items
}

async function batchDelete(pk, items) {
  if (items.length === 0) return
  for (const batch of chunk(items, 25)) {
    if (!DRY_RUN) {
      await db.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE]: batch.map((item) => ({
              DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
            })),
          },
        })
      )
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

const races = await queryAll(LIBRARY_PK, 'RACE#')
console.log(`Found ${races.length} library race(s).`)

if (races.length === 0) {
  console.log('Nothing to delete.')
  process.exit(0)
}

let totalAid = 0
let totalSections = 0

for (const race of races) {
  const raceId = race.raceId
  const racePK = `RACE#${raceId}`

  const aidStations = await queryAll(racePK, 'AID#')
  const sections = await queryAll(racePK, 'SECTION#')

  console.log(
    `  ${DRY_RUN ? '[dry-run] would delete' : 'Deleting'}: "${race.name}" (${raceId}) — ${aidStations.length} aid stations, ${sections.length} sections`
  )

  await batchDelete(racePK, aidStations)
  await batchDelete(racePK, sections)

  if (!DRY_RUN) {
    await db.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: LIBRARY_PK, SK: `RACE#${raceId}` },
      })
    )
  }

  totalAid += aidStations.length
  totalSections += sections.length
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] Would have deleted' : 'Deleted'}: ${races.length} races, ${totalAid} aid stations, ${totalSections} section plans.`
)
