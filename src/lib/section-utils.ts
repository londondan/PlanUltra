import type { AidStation, TrackPoint } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { RaceWeatherEntry } from '@/lib/weather-timeline'
import type { Section } from '@/types/section'
import { cumulativeDistances } from '@/lib/geo-utils'

const KM_TO_MI = 0.621371
const M_TO_FT = 3.28084

export function computeSections(
  aidStations: AidStation[],
  arrivalEstimates: ArrivalEstimate[],
  weatherEntries: RaceWeatherEntry[],
  trackPoints: TrackPoint[],
  raceStart: Date
): Section[] {
  // Step 1: identify drop-bag boundary stations
  const boundaries = aidStations
    .filter((s) => s.isStart || s.isFinish || s.hasDropBag)
    .sort((a, b) => a.order - b.order)

  if (boundaries.length < 2) return []

  // Step 2: build arrival lookup
  const arrivalMap = new Map<number, ArrivalEstimate>(
    arrivalEstimates.map((e) => [e.order, e])
  )

  // Step 3: precompute elevation data
  const hasElevation = trackPoints.length > 0 && trackPoints.some((tp) => tp.ele !== 0)
  const cumDist = hasElevation ? cumulativeDistances(trackPoints) : []

  // Step 4: build one Section per consecutive boundary pair
  const sections: Section[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const fromStation = boundaries[i]
    const toStation = boundaries[i + 1]

    // Distance
    const distanceKm = toStation.distanceFromStart - fromStation.distanceFromStart
    const distanceMiles = distanceKm * KM_TO_MI

    // Times
    const fromEst = arrivalMap.get(fromStation.order)
    const toEst = arrivalMap.get(toStation.order)
    const departureTime = fromEst?.estimatedArrival ?? null
    const arrivalTime = toEst?.estimatedArrival ?? null
    const durationMinutes =
      departureTime && arrivalTime
        ? (arrivalTime.getTime() - departureTime.getTime()) / 60000
        : null

    // Refill stops (stations between boundaries that are NOT drop-bag points)
    const refillStops = aidStations.filter(
      (s) =>
        s.order > fromStation.order &&
        s.order < toStation.order &&
        !s.isStart &&
        !s.isFinish &&
        !s.hasDropBag
    ).length

    // Elapsed hours for weather lookups
    const departureElapsedHours = departureTime
      ? (departureTime.getTime() - raceStart.getTime()) / 3_600_000
      : null
    const arrivalElapsedHours = arrivalTime
      ? (arrivalTime.getTime() - raceStart.getTime()) / 3_600_000
      : null

    // Temperature
    const depWeather =
      departureElapsedHours !== null
        ? nearestEntry(weatherEntries, departureElapsedHours)
        : null
    const arrWeather =
      arrivalElapsedHours !== null
        ? nearestEntry(weatherEntries, arrivalElapsedHours)
        : null
    const tempAtDeparture = depWeather?.temperature ?? null
    const tempAtArrival = arrWeather?.temperature ?? null
    const tempDelta =
      tempAtDeparture !== null && tempAtArrival !== null
        ? tempAtArrival - tempAtDeparture
        : null

    // Night detection from weather entries in the section's time window
    const windowEntries =
      departureElapsedHours !== null && arrivalElapsedHours !== null
        ? weatherEntries.filter(
            (e) =>
              e.elapsedHours >= departureElapsedHours &&
              e.elapsedHours <= arrivalElapsedHours
          )
        : []
    const hasNight = windowEntries.some((e) => e.isNight)
    const hasSunsetOrSunrise = windowEntries.some(
      (e, idx) => idx > 0 && e.isNight !== windowEntries[idx - 1].isNight
    )

    // Elevation
    let elevationGainFt: number | null = null
    let elevationLossFt: number | null = null
    if (hasElevation) {
      const { gainFt, lossFt } = sectionElevation(
        trackPoints,
        cumDist,
        fromStation.distanceFromStart,
        toStation.distanceFromStart
      )
      elevationGainFt = gainFt
      elevationLossFt = lossFt
    }

    sections.push({
      fromStation,
      toStation,
      distanceMiles,
      distanceKm,
      durationMinutes,
      departureTime,
      arrivalTime,
      refillStops,
      tempAtDeparture,
      tempAtArrival,
      tempDelta,
      hasNight,
      hasSunsetOrSunrise,
      elevationGainFt,
      elevationLossFt,
    })
  }

  return sections
}

// --- Helpers ---

function nearestEntry(
  entries: RaceWeatherEntry[],
  targetElapsedHours: number
): RaceWeatherEntry | null {
  if (entries.length === 0) return null
  return entries.reduce((best, entry) =>
    Math.abs(entry.elapsedHours - targetElapsedHours) <
    Math.abs(best.elapsedHours - targetElapsedHours)
      ? entry
      : best
  )
}

function sectionElevation(
  trackPoints: TrackPoint[],
  cumDist: number[],
  fromKm: number,
  toKm: number
): { gainFt: number; lossFt: number } {
  let gainM = 0
  let lossM = 0

  for (let i = 1; i < trackPoints.length; i++) {
    if (cumDist[i - 1] > toKm) break
    if (cumDist[i] < fromKm) continue
    const delta = trackPoints[i].ele - trackPoints[i - 1].ele
    if (delta > 0) gainM += delta
    else lossM += Math.abs(delta)
  }

  return {
    gainFt: Math.round(gainM * M_TO_FT),
    lossFt: Math.round(lossM * M_TO_FT),
  }
}
