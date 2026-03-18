import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'
import { randomUUID } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'

function compressGPX(gpx: string): string {
  return gzipSync(Buffer.from(gpx, 'utf8')).toString('base64')
}

function decompressGPX(compressed: string): string {
  return gunzipSync(Buffer.from(compressed, 'base64')).toString('utf8')
}

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
  crewShareToken?: string
  crewPublishedAt?: string
  paceMode?: 'pace' | 'finish'
  paceMin?: string
  paceSec?: string
  finishHours?: string
  finishMins?: string
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
      values[`:${key}`] = value
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

export async function deleteRace(userId: string, raceId: string): Promise<void> {
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
