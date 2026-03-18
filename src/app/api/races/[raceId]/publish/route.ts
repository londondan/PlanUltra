import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { getRaceById, updateRace } from '@/lib/db/races'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId } = await params
  const race = await getRaceById(session.user.id, raceId)
  if (!race) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const crewShareToken = randomUUID()
  const crewPublishedAt = new Date().toISOString()
  await updateRace(session.user.id, raceId, { crewShareToken, crewPublishedAt })
  return NextResponse.json({ crewShareToken, crewPublishedAt })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId } = await params
  const race = await getRaceById(session.user.id, raceId)
  if (!race) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // DynamoDB doesn't support unsetting via UpdateExpression SET with undefined;
  // we store empty string to indicate unpublished
  await updateRace(session.user.id, raceId, {
    crewShareToken: undefined,
    crewPublishedAt: undefined,
  })
  return NextResponse.json({ unpublished: true })
}
