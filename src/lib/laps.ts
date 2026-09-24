import type { AidStation } from '@/types/gpx'

const KM_PER_MI = 1.60934
const KM_TO_MI = 0.621371

/**
 * Expand single-lap station list to the full multi-lap sequence.
 * Stations are stored for one lap; this materialises the complete race order.
 *
 * Rules:
 *   - Start appears once at mile 0
 *   - Non-finish stations repeat each lap with distance offset
 *   - After each intermediate lap the Finish location becomes "Start/Finish (Lap N)"
 *   - The true final Finish keeps the name "Finish"
 */
export function expandLaps(
  stations: AidStation[],
  lapCount: number,
  lapDistanceMi: number
): AidStation[] {
  if (lapCount <= 1) return stations

  const lapDistanceKm = lapDistanceMi * KM_PER_MI
  const startStation = stations.find((s) => s.isStart)
  const finishStation = stations.find((s) => s.isFinish)
  const midStations = stations.filter((s) => !s.isStart && !s.isFinish)

  const result: AidStation[] = []

  if (startStation) result.push({ ...startStation })

  for (let lap = 1; lap <= lapCount; lap++) {
    const offset = (lap - 1) * lapDistanceKm

    for (const s of midStations) {
      result.push({ ...s, distanceFromStart: s.distanceFromStart + offset })
    }

    if (finishStation) {
      const endDist = finishStation.distanceFromStart + offset
      if (lap < lapCount) {
        result.push({
          ...finishStation,
          name: `Start/Finish (Lap ${lap + 1})`,
          distanceFromStart: endDist,
          isStart: false,
          isFinish: false,
          hasCrewAccess: true,
          hasDropBag: true,
        })
      } else {
        result.push({
          ...finishStation,
          name: 'Finish',
          distanceFromStart: endDist,
          isStart: false,
          isFinish: true,
        })
      }
    }
  }

  // Renumber and recalculate distanceFromPrev
  result.forEach((s, i) => {
    s.order = i
    s.distanceFromPrev = i === 0 ? 0 : s.distanceFromStart - result[i - 1].distanceFromStart
  })

  return result
}

/**
 * Return the course miles (in miles) at which a station is visited across all laps.
 * Used to render multi-lap mile badges on the stations editor.
 */
export function getVisitMiles(
  station: AidStation,
  lapCount: number,
  lapDistanceKm: number
): number[] {
  if (lapCount <= 1) return [station.distanceFromStart * KM_TO_MI]

  if (station.isStart) {
    // Appears only at the very start
    return [station.distanceFromStart * KM_TO_MI]
  }

  if (station.isFinish) {
    // Appears at end of every lap (as transition or final finish)
    return Array.from({ length: lapCount }, (_, k) =>
      (station.distanceFromStart + k * lapDistanceKm) * KM_TO_MI
    )
  }

  // Regular station: once per lap
  return Array.from({ length: lapCount }, (_, k) =>
    (station.distanceFromStart + k * lapDistanceKm) * KM_TO_MI
  )
}

export function formatMileBadge(miles: number[]): string {
  return miles.map((m) => `MI ${m.toFixed(1)}`).join(' · ')
}
