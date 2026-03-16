import { PutCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'
import { chunkArray } from '@/lib/db/aid-stations'
import type { SectionPlan } from '@/types/section'

function sectionSK(fromStationOrder: number): string {
  return `SECTION#${String(fromStationOrder).padStart(4, '0')}`
}

export async function getSectionPlans(raceId: string): Promise<SectionPlan[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `RACE#${raceId}`,
        ':prefix': 'SECTION#',
      },
    })
  )
  return (result.Items ?? []).map((item) => item as unknown as SectionPlan)
}

export async function upsertSectionPlan(plan: SectionPlan): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `RACE#${plan.raceId}`,
        SK: sectionSK(plan.fromStationOrder),
        ...plan,
      },
    })
  )
}

export async function deleteSectionPlans(raceId: string): Promise<void> {
  const plans = await getSectionPlans(raceId)
  if (plans.length === 0) return

  const chunks = chunkArray(plans, 25)
  for (const chunk of chunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((p) => ({
            DeleteRequest: {
              Key: {
                PK: `RACE#${raceId}`,
                SK: sectionSK(p.fromStationOrder),
              },
            },
          })),
        },
      })
    )
  }
}
