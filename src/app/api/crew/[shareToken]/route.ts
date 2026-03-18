import { NextRequest, NextResponse } from 'next/server'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'
import type { Race } from '@/lib/db/races'

// NOTE: This uses a table scan filtered by crewShareToken.
// TODO: Add a GSI on crewShareToken for production performance.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'crewShareToken = :token',
      ExpressionAttributeValues: { ':token': shareToken },
      ProjectionExpression: '#n, raceId',
      ExpressionAttributeNames: { '#n': 'name' },
    })
  )

  if (!result.Items || result.Items.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const race = result.Items[0] as Pick<Race, 'name' | 'raceId'>
  return NextResponse.json({ raceName: race.name, raceId: race.raceId })
}
