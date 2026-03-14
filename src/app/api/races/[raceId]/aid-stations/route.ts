import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById } from '@/lib/db/races'
import { getAidStations, updateAidStation, saveAidStations } from '@/lib/db/aid-stations'
import type { AidStation } from '@/types/gpx'

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
  return NextResponse.json({ aidStations })
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

  // If full stations array provided, save all
  if (Array.isArray(body.aidStations)) {
    await saveAidStations(raceId, body.aidStations)
    return NextResponse.json({ success: true })
  }

  // Single-station flag update: sync hasDropBag / hasCrewAccess to all visits
  // that share the same physicalName so repeated aid stations stay in sync.
  if (typeof body.order === 'number' && body.updates) {
    const updates = body.updates as Partial<AidStation>
    const flagKeys: (keyof AidStation)[] = ['hasDropBag', 'hasCrewAccess']
    const hasFlagUpdate = flagKeys.some((k) => k in updates)

    if (hasFlagUpdate) {
      const allStations = await getAidStations(raceId)
      const target = allStations.find((s) => s.order === body.order)
      const targetPhysical = target?.physicalName ?? target?.name

      if (targetPhysical) {
        const siblings = allStations.filter(
          (s) => (s.physicalName ?? s.name) === targetPhysical
        )
        await Promise.all(siblings.map((s) => updateAidStation(raceId, s.order, updates)))
        return NextResponse.json({ success: true })
      }
    }

    await updateAidStation(raceId, body.order, updates)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}
