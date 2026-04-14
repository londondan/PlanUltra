import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById, decompressGPX } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { parseGPX } from '@/lib/gpx-parser'
import { cumulativeDistances, interpolateAtDistance, computeSegmentElevation } from '@/lib/geo-utils'
import type { AidStation } from '@/types/gpx'

const KM_PER_MI = 1.60934

export async function POST(
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
  if (!race.gpxData) {
    return NextResponse.json({ error: 'This race has no GPX data' }, { status: 400 })
  }

  const body = await req.json()
  const { distanceMi, name } = body as { distanceMi: unknown; name: unknown }

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Station name is required' }, { status: 400 })
  }
  if (typeof distanceMi !== 'number' || isNaN(distanceMi) || distanceMi <= 0) {
    return NextResponse.json({ error: 'Mile marker must be a positive number' }, { status: 400 })
  }

  // Parse GPX
  let trackPoints: ReturnType<typeof parseGPX>['trackPoints']
  try {
    const gpxString = decompressGPX(race.gpxData)
    ;({ trackPoints } = parseGPX(gpxString))
  } catch {
    return NextResponse.json({ error: 'Failed to parse race GPX' }, { status: 500 })
  }

  const cumDist = cumulativeDistances(trackPoints)
  const totalKm = cumDist[cumDist.length - 1]
  const distKm = distanceMi * KM_PER_MI

  if (distKm >= totalKm) {
    const maxMi = (totalKm / KM_PER_MI).toFixed(1)
    return NextResponse.json(
      { error: `Mile marker must be less than the total race distance (${maxMi} mi)` },
      { status: 400 }
    )
  }

  // Get existing stations
  const existingStations = await getAidStations(raceId)
  if (existingStations.length === 0) {
    return NextResponse.json({ error: 'No aid stations found for this race' }, { status: 400 })
  }

  // Sort by distanceFromStart to ensure correct ordering
  const sorted = [...existingStations].sort((a, b) => a.distanceFromStart - b.distanceFromStart)

  // Find where to insert: first station beyond the requested distance
  const insertIdx = sorted.findIndex((s) => s.distanceFromStart > distKm)
  const effectiveInsertIdx = insertIdx === -1 ? sorted.length - 1 : insertIdx

  // Guard: don't allow inserting at or after the Finish
  const finishStation = sorted[sorted.length - 1]
  if (distKm >= finishStation.distanceFromStart) {
    const maxMi = (finishStation.distanceFromStart / KM_PER_MI).toFixed(1)
    return NextResponse.json(
      { error: `Mile marker must be before the finish (${maxMi} mi)` },
      { status: 400 }
    )
  }

  const prevStation = sorted[effectiveInsertIdx - 1] ?? sorted[0]
  const nextStation = sorted[effectiveInsertIdx]

  // Interpolate position and elevation at the requested distance
  const { lat, lon } = interpolateAtDistance(distKm, cumDist, trackPoints)
  const { grossClimbM, grossDescentM } = computeSegmentElevation(
    trackPoints,
    cumDist,
    prevStation.distanceFromStart,
    distKm
  )

  const newStation: AidStation = {
    order: effectiveInsertIdx, // will be renumbered below
    name: name.trim(),
    physicalName: name.trim(),
    lat,
    lon,
    distanceFromStart: distKm,
    distanceFromPrev: distKm - prevStation.distanceFromStart,
    grossClimbM,
    grossDescentM,
    elevationGain: 0,
    hasDropBag: false,
    hasCrewAccess: false,
  }

  // Recalculate next station's distance and elevation
  const updatedNext: AidStation = {
    ...nextStation,
    distanceFromPrev: nextStation.distanceFromStart - distKm,
    ...computeSegmentElevation(trackPoints, cumDist, distKm, nextStation.distanceFromStart),
  }

  // Build the updated list: insert new station, update next, renumber order
  const updated: AidStation[] = [
    ...sorted.slice(0, effectiveInsertIdx),
    newStation,
    updatedNext,
    ...sorted.slice(effectiveInsertIdx + 1),
  ].map((s, i) => ({ ...s, order: i }))

  return NextResponse.json({ aidStations: updated })
}
