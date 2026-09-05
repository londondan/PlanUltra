import type { AidStation, TrackPoint } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { RaceWeatherEntry } from '@/lib/weather-timeline'
import type { Section, WeatherCondition, WeatherConditionType } from '@/types/section'
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
  // For old data lacking isStart/isFinish flags, infer from position.
  const sorted = [...aidStations].sort((a, b) => a.order - b.order)
  const hasExplicitStart = aidStations.some((s) => s.isStart)
  const hasExplicitFinish = aidStations.some((s) => s.isFinish)

  const boundaries = sorted.filter((s, i) => {
    if (s.isStart || s.isFinish || s.hasDropBag) return true
    if (!hasExplicitStart && i === 0) return true
    if (!hasExplicitFinish && i === sorted.length - 1) return true
    return false
  })

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

    // Dominant weather condition
    const weatherCondition = windowEntries.length > 0 ? getDominantCondition(windowEntries) : null

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
      weatherCondition,
    })
  }

  return sections
}

// --- Weather condition helpers ---

const CONDITION_PRIORITY: WeatherConditionType[] = ['storm', 'snow', 'rain', 'fog', 'wind', 'clear']

const CONDITION_EMOJI: Record<WeatherConditionType, string> = {
  storm: '⛈️',
  snow: '❄️',
  rain: '🌧️',
  fog: '🌫️',
  wind: '💨',
  clear: '☀️',
}

function weatherCodeToConditionType(code: number, windSpeed: number): WeatherConditionType {
  if (code >= 95) return 'storm'
  if (code >= 85) return 'snow'
  if (code >= 80) return 'rain'
  if (code >= 70) return 'snow'
  if (code >= 50) return 'rain'
  if (code >= 40) return 'fog'
  if (windSpeed > 25) return 'wind'
  return 'clear'
}

function getDominantCondition(entries: RaceWeatherEntry[]): WeatherCondition {
  let dominant: WeatherConditionType = 'clear'
  let maxWindSpeed = 0
  let minTemp = Infinity
  let maxTemp = -Infinity

  for (const e of entries) {
    const type = weatherCodeToConditionType(e.weatherCode, e.windSpeed)
    if (CONDITION_PRIORITY.indexOf(type) < CONDITION_PRIORITY.indexOf(dominant)) {
      dominant = type
    }
    if (e.windSpeed > maxWindSpeed) maxWindSpeed = e.windSpeed
    if (e.temperature < minTemp) minTemp = e.temperature
    if (e.temperature > maxTemp) maxTemp = e.temperature
  }

  let subLabel: string
  switch (dominant) {
    case 'clear':
      subLabel = maxWindSpeed < 15
        ? 'Clear · light wind'
        : `Clear · ${Math.round(maxWindSpeed)} mph wind`
      break
    case 'rain':
      subLabel = 'Rain showers expected'
      break
    case 'storm':
      subLabel = 'Storm risk · check timing'
      break
    case 'snow':
      subLabel = 'Snow expected · check conditions'
      break
    case 'fog':
      subLabel = 'Fog · reduced visibility'
      break
    case 'wind':
      subLabel = `${Math.round(maxWindSpeed)} mph sustained winds`
      break
  }

  return {
    type: dominant,
    emoji: CONDITION_EMOJI[dominant],
    minTemp: Math.round(minTemp),
    maxTemp: Math.round(maxTemp),
    subLabel,
  }
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
