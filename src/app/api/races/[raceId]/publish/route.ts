import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { auth } from '@/lib/auth'
import { getRaceById, updateRace, LIBRARY_USER_ID } from '@/lib/db/races'
import { isAdmin } from '@/lib/admin'

async function resolveRace(userId: string, email: string | null | undefined, raceId: string) {
  const race = await getRaceById(userId, raceId)
  if (race) return { race, ownerId: userId }
  // Admin can also publish/unpublish library races
  if (isAdmin(email)) {
    const libraryRace = await getRaceById(LIBRARY_USER_ID, raceId)
    if (libraryRace) return { race: libraryRace, ownerId: LIBRARY_USER_ID }
  }
  return null
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId } = await params
  const resolved = await resolveRace(session.user.id, session.user.email, raceId)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const crewShareToken = randomBytes(12).toString('base64url')
  const crewPublishedAt = new Date().toISOString()
  const runnerName = session.user.name ?? ''
  await updateRace(resolved.ownerId, raceId, { crewShareToken, crewPublishedAt, runnerName })
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
  const resolved = await resolveRace(session.user.id, session.user.email, raceId)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await updateRace(resolved.ownerId, raceId, {
    crewShareToken: undefined,
    crewPublishedAt: undefined,
  })
  return NextResponse.json({ unpublished: true })
}
