import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById, updateRace, deleteRace } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { getSectionPlans } from '@/lib/db/sections'

// Fields a runner may update on their own race via PUT/PATCH.
// Race Facts (name, date, gpxData, rdName, etc.) are admin-managed and must not
// be overwritten by the runner. Crew tokens are managed by /publish. System
// fields (raceId, userId, createdAt) are immutable.
const RUNNER_PLAN_FIELDS = new Set([
  'caloriesPerHour',
  'targetFinishMinutes',
  'paceOverrides',
  'paceMode',
  'paceMin',
  'paceSec',
  'finishHours',
  'finishMins',
])

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

  const body = await req.json()
  const updates = Object.fromEntries(
    Object.entries(body).filter(([key]) => RUNNER_PLAN_FIELDS.has(key))
  )
  if (Object.keys(updates).length > 0) {
    await updateRace(session.user.id, raceId, updates)
  }
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

  const body = await req.json()
  const updates = Object.fromEntries(
    Object.entries(body).filter(([key]) => RUNNER_PLAN_FIELDS.has(key))
  )
  if (Object.keys(updates).length > 0) {
    await updateRace(session.user.id, raceId, updates)
  }
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
