import type { AidStation } from '@/types/gpx'

const KM_TO_MI = 0.621371

export type PaceConfig =
  | { mode: 'pace'; minutesPerMile: number }
  | { mode: 'finish'; targetMinutes: number; totalDistanceKm: number }

export interface ArrivalEstimate {
  order: number
  name: string
  estimatedArrival: Date
  elapsedMinutes: number
}

/** Weight proxy for a segment: flat distance + climb penalty + descent penalty */
export function segmentWeight(station: AidStation): number {
  return (
    station.distanceFromPrev +
    (station.grossClimbM ?? 0) / 100 +
    (station.grossDescentM ?? 0) / 500
  )
}

/**
 * Terrain-weighted arrival times with anchor-based override redistribution.
 *
 * @param overrides - Record<string(order), ISO 8601 datetime string>
 */
export function calculateArrivalTimesWithOverrides(
  targetMinutes: number,
  aidStations: AidStation[],
  raceStart: Date,
  overrides: Record<string, string> = {}
): ArrivalEstimate[] {
  if (aidStations.length === 0) return []

  const weights = aidStations.map(segmentWeight)

  // Build anchor map: index → Date
  const anchors = new Map<number, Date>()
  anchors.set(0, raceStart)
  anchors.set(aidStations.length - 1, new Date(raceStart.getTime() + targetMinutes * 60_000))

  // Override of finish time
  const finishOrderStr = String(aidStations[aidStations.length - 1].order)
  if (overrides[finishOrderStr]) {
    anchors.set(aidStations.length - 1, new Date(overrides[finishOrderStr]))
  }

  // Mid-race overrides
  for (const [orderStr, isoStr] of Object.entries(overrides)) {
    const order = parseInt(orderStr)
    const idx = aidStations.findIndex((s) => s.order === order)
    if (idx > 0 && idx < aidStations.length - 1) {
      anchors.set(idx, new Date(isoStr))
    }
  }

  const arrivals: Date[] = new Array(aidStations.length)
  arrivals[0] = anchors.get(0)!

  const anchorIndices = Array.from(anchors.keys()).sort((a, b) => a - b)

  for (let a = 0; a < anchorIndices.length - 1; a++) {
    const startIdx = anchorIndices[a]
    const endIdx = anchorIndices[a + 1]
    const startTime = anchors.get(startIdx)!
    const endTime = anchors.get(endIdx)!
    const deltaMs = endTime.getTime() - startTime.getTime()
    const segWeights = weights.slice(startIdx + 1, endIdx + 1)
    const totalW = segWeights.reduce((s, w) => s + w, 0)

    let cumW = 0
    for (let i = startIdx + 1; i <= endIdx; i++) {
      cumW += weights[i]
      const frac = totalW > 0 ? cumW / totalW : (i - startIdx) / (endIdx - startIdx)
      arrivals[i] = new Date(startTime.getTime() + deltaMs * frac)
    }
  }

  return aidStations.map((station, i) => ({
    order: station.order,
    name: station.name,
    estimatedArrival: arrivals[i],
    elapsedMinutes: (arrivals[i].getTime() - raceStart.getTime()) / 60_000,
  }))
}

/**
 * Calculates estimated arrival times at each aid station.
 *
 * Stable public interface — internally uses terrain-weighted allocation via
 * calculateArrivalTimesWithOverrides. Signature is unchanged so all existing
 * callers (weather, crew sheet) are unaffected.
 *
 * @param config  - Either a flat pace (min/mile) or a target finish time
 * @param aidStations - Ordered aid stations with distanceFromStart in km
 * @param raceStart - The race start datetime
 */
export function calculateArrivalTimes(
  config: PaceConfig,
  aidStations: AidStation[],
  raceStart: Date
): ArrivalEstimate[] {
  if (aidStations.length === 0) return []

  let targetMinutes: number

  if (config.mode === 'pace') {
    const totalMiles = aidStations[aidStations.length - 1].distanceFromStart * KM_TO_MI
    if (totalMiles === 0) return []
    targetMinutes = config.minutesPerMile * totalMiles
  } else {
    const totalMiles = config.totalDistanceKm * KM_TO_MI
    if (totalMiles === 0) return []
    targetMinutes = config.targetMinutes
  }

  return calculateArrivalTimesWithOverrides(targetMinutes, aidStations, raceStart, {})
}
