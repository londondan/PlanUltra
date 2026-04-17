import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById, updateRace, deleteRace } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { getSectionPlans } from '@/lib/db/sections'

export async function GET(
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

  const aidStations = await getAidStations(raceId)
  const sectionPlans = await getSectionPlans(raceId)
  return NextResponse.json({ race, aidStations, sectionPlans })
}

export async function PUT(
  req: NextRequest,
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

  const updates = await req.json()
  await updateRace(session.user.id, raceId, updates)
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
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

  const updates = await req.json()
  await updateRace(session.user.id, raceId, updates)
  return NextResponse.json({ success: true })
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

  await deleteRace(session.user.id, raceId)
  return NextResponse.json({ success: true })
}
