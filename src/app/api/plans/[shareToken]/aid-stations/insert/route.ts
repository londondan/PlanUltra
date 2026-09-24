import { NextRequest, NextResponse } from 'next/server'
import { requirePlanEdit } from '@/lib/plan-access'
import { decompressGPX } from '@/lib/db/races'
import { parseGPX } from '@/lib/gpx-parser'
import { cumulativeDistances, interpolateAtDistance, computeSegmentElevation } from '@/lib/geo-utils'
import type { AidStation } from '@/types/gpx'

const KM_PER_MI = 1.60934

export async function POST(
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
  if (!race.gpxData) {
    return NextResponse.json({ error: 'This plan has no GPX data' }, { status: 400 })
  }

  const body = await req.json()
  const { distanceMi, name, currentStations } = body as { distanceMi: unknown; name: unknown; currentStations: unknown }

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Station name is required' }, { status: 400 })
  }
  if (typeof distanceMi !== 'number' || isNaN(distanceMi) || distanceMi <= 0) {
    return NextResponse.json({ error: 'Mile marker must be a positive number' }, { status: 400 })
  }

  let trackPoints: ReturnType<typeof parseGPX>['trackPoints']
  try {
    ;({ trackPoints } = parseGPX(decompressGPX(race.gpxData)))
  } catch {
    return NextResponse.json({ error: 'Failed to parse race GPX' }, { status: 500 })
  }

  const cumDist = cumulativeDistances(trackPoints)
  const totalKm = cumDist[cumDist.length - 1]
  const distKm = distanceMi * KM_PER_MI

  if (distKm >= totalKm) {
    return NextResponse.json(
      { error: `Mile marker must be less than the total race distance (${(totalKm / KM_PER_MI).toFixed(1)} mi)` },
      { status: 400 }
    )
  }

  if (!Array.isArray(currentStations) || currentStations.length === 0) {
    return NextResponse.json({ error: 'No aid stations found for this race' }, { status: 400 })
  }
  const existingStations = currentStations as AidStation[]
  const sorted = [...existingStations].sort((a, b) => a.distanceFromStart - b.distanceFromStart)

  const finishStation = sorted[sorted.length - 1]
  if (distKm >= finishStation.distanceFromStart) {
    return NextResponse.json(
      { error: `Mile marker must be before the finish (${(finishStation.distanceFromStart / KM_PER_MI).toFixed(1)} mi)` },
      { status: 400 }
    )
  }

  const insertIdx = sorted.findIndex((s) => s.distanceFromStart > distKm)
  const effectiveInsertIdx = insertIdx === -1 ? sorted.length - 1 : insertIdx
  const prevStation = sorted[effectiveInsertIdx - 1] ?? sorted[0]
  const nextStation = sorted[effectiveInsertIdx]

  const { lat, lon } = interpolateAtDistance(distKm, cumDist, trackPoints)
  const { grossClimbM, grossDescentM } = computeSegmentElevation(
    trackPoints, cumDist, prevStation.distanceFromStart, distKm
  )

  const newStation: AidStation = {
    order: effectiveInsertIdx,
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

  const updatedNext: AidStation = {
    ...nextStation,
    distanceFromPrev: nextStation.distanceFromStart - distKm,
    ...computeSegmentElevation(trackPoints, cumDist, distKm, nextStation.distanceFromStart),
  }

  const updated: AidStation[] = [
    ...sorted.slice(0, effectiveInsertIdx),
    newStation,
    updatedNext,
    ...sorted.slice(effectiveInsertIdx + 1),
  ].map((s, i) => ({ ...s, order: i }))

  return NextResponse.json({ aidStations: updated })
}
