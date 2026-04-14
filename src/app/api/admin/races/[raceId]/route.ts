import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getRaceById, updateRace, deleteRace, LIBRARY_USER_ID } from '@/lib/db/races'
import { getAidStations, saveAidStations, deleteAidStations, updateAidStation } from '@/lib/db/aid-stations'
import { deleteSectionPlans } from '@/lib/db/sections'
import { parseGPX, extractAidStations } from '@/lib/gpx-parser'
import type { AidStation } from '@/types/gpx'

async function checkAdmin() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) return null
  return session
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''
  const updates: Record<string, unknown> = {}
  let stationUpdates: Array<{ order: number } & Partial<AidStation>> | undefined
  let gpxString: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    for (const [key, value] of form.entries()) {
      if (key === 'gpx') {
        updates.gpxData = await (value as File).text()
      } else {
        updates[key] = String(value)
      }
    }
  } else {
    const body = await req.json()
    const { stationUpdates: su, gpxString: gs, ...rest } = body
    stationUpdates = su
    gpxString = gs
    Object.assign(updates, rest)
  }

  // Apply race-level field updates
  await updateRace(LIBRARY_USER_ID, raceId, updates as Parameters<typeof updateRace>[2])

  // Apply station location updates (patch only location fields)
  if (stationUpdates?.length) {
    await Promise.all(
      stationUpdates.map(({ order, crewParkingCoords, crewParkingType, crewLocationNotes, hasCrewAccess, crewParkingCoordsSource }) =>
        updateAidStation(raceId, order, { crewParkingCoords, crewParkingType, crewLocationNotes, hasCrewAccess, crewParkingCoordsSource })
      )
    )
  }

  // GPX re-ingestion
  if (gpxString) {
    const existingStations = await getAidStations(raceId)
    const { trackPoints, waypoints } = parseGPX(gpxString)
    const newStations = extractAidStations(waypoints, trackPoints)

    const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    const existingByName = new Map(existingStations.map((s) => [normalise(s.name), s]))

    const mergedStations: AidStation[] = newStations.map((s) => {
      const freshCoords = { lat: s.lat, lng: s.lon }
      const match = existingByName.get(normalise(s.name))
      if (!match) return { ...s, crewParkingCoords: freshCoords, crewParkingCoordsSource: 'gpx' as const }
      const adminConfirmed = match.crewParkingCoordsSource === 'admin'
      return {
        ...s,
        crewParkingCoords: adminConfirmed ? match.crewParkingCoords : freshCoords,
        crewParkingType: match.crewParkingType,
        crewLocationNotes: match.crewLocationNotes,
        crewParkingCoordsSource: adminConfirmed ? 'admin' as const : 'gpx' as const,
      }
    })

    try {
      await deleteAidStations(raceId)
      await saveAidStations(raceId, mergedStations)
      await updateRace(LIBRARY_USER_ID, raceId, { gpxData: gpxString })
    } catch {
      // Rollback: restore original stations
      try {
        await deleteAidStations(raceId)
        await saveAidStations(raceId, existingStations)
      } catch { /* best effort */ }
      return NextResponse.json(
        { error: 'GPX re-ingestion failed; original stations restored' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reingested: true,
      stationCount: mergedStations.length,
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await deleteAidStations(raceId)
    await deleteSectionPlans(raceId)
    await deleteRace(LIBRARY_USER_ID, raceId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
