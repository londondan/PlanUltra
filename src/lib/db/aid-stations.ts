import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'
import type { AidStation } from '@/types/gpx'

export async function saveAidStations(raceId: string, stations: AidStation[]): Promise<void> {
  if (stations.length === 0) return

  // DynamoDB batch write (max 25 items per request)
  const chunks = chunkArray(stations, 25)

  for (const chunk of chunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((station) => ({
            PutRequest: {
              Item: {
                PK: `RACE#${raceId}`,
                SK: `AID#${String(station.order).padStart(4, '0')}`,
                ...station,
              },
            },
          })),
        },
      })
    )
  }
}

export async function getAidStations(raceId: string): Promise<AidStation[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `RACE#${raceId}`,
        ':prefix': 'AID#',
      },
    })
  )

  return (result.Items ?? []).map((item: Record<string, unknown>) => {
    // Strip DynamoDB key attributes — they must not bleed into station objects and
    // override the recomputed SK when saving after a renumber (e.g. insert a station).
    const { PK: _pk, SK: _sk, ...station } = item
    return station as unknown as AidStation
  })
}

export async function updateAidStation(
  raceId: string,
  order: number,
  updates: Partial<AidStation>
): Promise<void> {
  const expressions: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    expressions.push(`#${key} = :${key}`)
    names[`#${key}`] = key
    values[`:${key}`] = value
  }

  if (expressions.length === 0) return

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `RACE#${raceId}`,
        SK: `AID#${String(order).padStart(4, '0')}`,
      },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  )
}

export async function deleteAidStations(raceId: string): Promise<void> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `RACE#${raceId}`,
        ':prefix': 'AID#',
      },
      ProjectionExpression: 'SK',
    })
  )

  const items = result.Items ?? []
  if (items.length === 0) return

  const chunks = chunkArray(items, 25)
  for (const chunk of chunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            DeleteRequest: {
              Key: {
                PK: `RACE#${raceId}`,
                SK: item.SK as string,
              },
            },
          })),
        },
      })
    )
  }
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
