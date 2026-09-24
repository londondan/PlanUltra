import { NextRequest, NextResponse } from 'next/server'
import { getRaceByCrewToken } from '@/lib/db/races'
import { requirePlanEdit } from '@/lib/plan-access'
import { getAidStations, updateAidStation, saveAidStations } from '@/lib/db/aid-stations'
import type { AidStation } from '@/types/gpx'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const race = await getRaceByCrewToken(shareToken)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const aidStations = await getAidStations(race.raceId)
  return NextResponse.json({ aidStations, hasGPX: !!race.gpxData, race })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const editKey = req.headers.get('x-edit-key') ?? ''
  const access = await requirePlanEdit(shareToken, editKey)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { race } = access
  const body = await req.json()

  if (Array.isArray(body.aidStations)) {
    await saveAidStations(race.raceId, body.aidStations)
    return NextResponse.json({ ok: true })
  }

  if (typeof body.order === 'number' && body.updates) {
    const updates = body.updates as Partial<AidStation>
    const flagKeys: (keyof AidStation)[] = [
      'hasDropBag',
      'hasCrewAccess',
      'crewParkingCoords',
      'crewParkingUrl',
      'crewParkingType',
      'crewLocationNotes',
    ]
    const hasFlagUpdate = flagKeys.some((k) => k in updates)

    if (hasFlagUpdate) {
      const allStations = await getAidStations(race.raceId)
      const target = allStations.find((s) => s.order === body.order)
      const targetPhysical = target?.physicalName ?? target?.name

      if (targetPhysical) {
        const siblings = allStations.filter(
          (s) => (s.physicalName ?? s.name) === targetPhysical
        )
        await Promise.all(siblings.map((s) => updateAidStation(race.raceId, s.order, updates)))
        return NextResponse.json({ ok: true })
      }
    }

    await updateAidStation(race.raceId, body.order, updates)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}
