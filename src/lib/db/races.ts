import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'
import { deleteAidStations } from '@/lib/db/aid-stations'
import { deleteSectionPlans } from '@/lib/db/sections'
import { randomUUID } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'

function compressGPX(gpx: string): string {
  return gzipSync(Buffer.from(gpx, 'utf8')).toString('base64')
}

export function decompressGPX(compressed: string): string {
  try {
    return gunzipSync(Buffer.from(compressed, 'base64')).toString('utf8')
  } catch {
    // Data is uncompressed (raw GPX string) — return as-is
    return compressed
  }
}

export const LIBRARY_USER_ID = '__LIBRARY__'

export interface Race {
  raceId: string
  userId: string
  name: string
  date: string
  startTime: string
  timezone: string
  caloriesPerHour?: number
  gpxUrl?: string
  gpxData?: string
  startLat?: number
  startLon?: number
  createdAt: string
  targetFinishMinutes?: number
  paceOverrides?: Record<string, string>  // keyed by AidStation.order as string, value ISO 8601
  crewShareToken?: string
  crewPublishedAt?: string
  runnerName?: string
  paceMode?: 'pace' | 'finish'
  paceMin?: string
  paceSec?: string
  finishHours?: string
  finishMins?: string
  isLibraryRace?: boolean
  libraryDescription?: string | null
  location?: string | null
}

export async function getRaceByCrewToken(token: string): Promise<Race | null> {
  // Try GSI first (fast, O(1))
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'CrewTokenIndex',
        KeyConditionExpression: 'crewShareToken = :token',
        ExpressionAttributeValues: { ':token': token },
        Limit: 1,
      })
    )
    if (result.Items && result.Items.length > 0) {
      const race = result.Items[0] as unknown as Race
      if (race.gpxData) race.gpxData = decompressGPX(race.gpxData)
      return race
    }
    return null
  } catch (err) {
    // If IAM doesn't cover the index yet, fall back to a full-table scan.
    const errName = (err as { name?: string }).name ?? ''
    if (errName !== 'AccessDeniedException' && errName !== 'ValidationException') {
      throw err // re-throw unexpected errors
    }
  }

  // Fallback: scan (slow, but correct until IAM policy covers the index)
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
  const scan = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'crewShareToken = :token',
      ExpressionAttributeValues: { ':token': token },
    })
  )
  if (!scan.Items || scan.Items.length === 0) return null
  const race = scan.Items[0] as unknown as Race
  if (race.gpxData) race.gpxData = decompressGPX(race.gpxData)
  return race
}

export async function createRace(
  userId: string,
  data: Omit<Race, 'raceId' | 'userId' | 'createdAt'>
): Promise<Race> {
  const raceId = randomUUID()
  const now = new Date().toISOString()

  const race: Race = {
    ...data,
    raceId,
    userId,
    createdAt: now,
  }

  const item = { ...race }
  if (item.gpxData) {
    item.gpxData = compressGPX(item.gpxData)
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `RACE#${raceId}`,
        ...item,
      },
    })
  )

  return race
}

export async function getRacesByUser(userId: string): Promise<Race[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'RACE#',
      },
    })
  )

  return (result.Items ?? []).map((item: Record<string, unknown>) => {
    const race = item as unknown as Race
    if (race.gpxData) race.gpxData = decompressGPX(race.gpxData)
    return race
  })
}

export async function getRaceById(userId: string, raceId: string): Promise<Race | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `RACE#${raceId}`,
      },
    })
  )

  if (!result.Item) return null
  const race = result.Item as unknown as Race
  if (race.gpxData) race.gpxData = decompressGPX(race.gpxData)
  return race
}

export async function updateRace(
  userId: string,
  raceId: string,
  updates: Partial<Omit<Race, 'raceId' | 'userId' | 'createdAt'>>
): Promise<void> {
  const setExpressions: string[] = []
  const removeExpressions: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      removeExpressions.push(`#${key}`)
      names[`#${key}`] = key
    } else {
      setExpressions.push(`#${key} = :${key}`)
      names[`#${key}`] = key
      values[`:${key}`] = key === 'gpxData' ? compressGPX(value as string) : value
    }
  }

  if (setExpressions.length === 0 && removeExpressions.length === 0) return

  const parts: string[] = []
  if (setExpressions.length > 0) parts.push(`SET ${setExpressions.join(', ')}`)
  if (removeExpressions.length > 0) parts.push(`REMOVE ${removeExpressions.join(', ')}`)

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `RACE#${raceId}` },
      UpdateExpression: parts.join(' '),
      ExpressionAttributeNames: names,
      ...(Object.keys(values).length > 0 ? { ExpressionAttributeValues: values } : {}),
    })
  )
}

export async function getLibraryRaces(): Promise<Race[]> {
  return getRacesByUser(LIBRARY_USER_ID)
}

export interface RaceActivityDay {
  date: string  // YYYY-MM-DD (UTC)
  count: number
}

export async function getRaceActivity(
  days: number,
  excludeUserIds: string[] = []
): Promise<RaceActivityDay[]> {
  // Build rolling window — today is always the last entry (rightmost bar).
  const now = new Date()
  const since = new Date(now)
  since.setUTCDate(since.getUTCDate() - (days - 1))
  since.setUTCHours(0, 0, 0, 0)

  // Collect all calendar days in the window so zeros are always present.
  const dayMap: Map<string, number> = new Map()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setUTCDate(d.getUTCDate() + i)
    dayMap.set(d.toISOString().slice(0, 10), 0)
  }

  const excludePKs = new Set([
    `USER#${LIBRARY_USER_ID}`,
    ...excludeUserIds.map((id) => `USER#${id}`),
  ])

  // TODO: add a GSI on createdAt when race count grows to avoid full-table scans.
  let lastKey: Record<string, unknown> | undefined
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(SK, :racePrefix) AND createdAt >= :since',
        ExpressionAttributeValues: {
          ':racePrefix': 'RACE#',
          ':since': since.toISOString(),
        },
        ProjectionExpression: 'PK, createdAt',
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      })
    )

    for (const item of result.Items ?? []) {
      const pk = item.PK as string
      if (excludePKs.has(pk)) continue
      const dateKey = (item.createdAt as string).slice(0, 10)
      if (dayMap.has(dateKey)) {
        dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1)
      }
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export async function deleteRace(userId: string, raceId: string): Promise<void> {
  await Promise.all([deleteAidStations(raceId), deleteSectionPlans(raceId)])
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `RACE#${raceId}`,
      },
    })
  )
}
