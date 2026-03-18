import type { HourlyForecast } from '@/lib/weather-client'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { TrackPoint } from '@/types/gpx'
import { cumulativeDistances } from '@/lib/geo-utils'

export interface RaceWeatherEntry {
  hour: string        // ISO time string
  locationLat: number
  locationLon: number
  temperature: number
  precipitationProbability: number
  windSpeed: number
  weatherCode: number
  isNight: boolean
  elapsedHours: number
}

/**
 * Aligns hourly weather forecasts to the runner's estimated position on course.
 * For each forecast hour within the race window, interpolates the runner's
 * lat/lon based on arrival time estimates and track point distances.
 */
export function alignWeatherToRace(
  forecasts: HourlyForecast[],
  arrivalEstimates: ArrivalEstimate[],
  trackPoints: TrackPoint[],
  raceStart: Date
): RaceWeatherEntry[] {
  if (forecasts.length === 0 || arrivalEstimates.length === 0 || trackPoints.length === 0) {
    return []
  }

  const lastArrival = arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival
  const cumDistKm = cumulativeDistances(trackPoints)
  const totalDistKm = cumDistKm[cumDistKm.length - 1]

  const result: RaceWeatherEntry[] = []

  for (const forecast of forecasts) {
    const forecastTime = new Date(forecast.time)

    // Only include hours within the race window
    if (forecastTime < raceStart || forecastTime > lastArrival) continue

    const elapsedMs = forecastTime.getTime() - raceStart.getTime()
    const elapsedHours = elapsedMs / (1000 * 60 * 60)

    // Interpolate runner's distance at this hour
    const runnerDistKm = interpolateRunnerDistance(
      forecastTime,
      arrivalEstimates,
      totalDistKm
    )

    // Find position on track
    const { lat, lon } = interpolatePosition(runnerDistKm, cumDistKm, trackPoints)

    result.push({
      hour: forecast.time,
      locationLat: lat,
      locationLon: lon,
      temperature: forecast.temperature,
      precipitationProbability: forecast.precipitationProbability,
      windSpeed: forecast.windSpeed,
      weatherCode: forecast.weatherCode,
      isNight: forecast.isNight,
      elapsedHours,
    })
  }

  return result
}

function interpolateRunnerDistance(
  time: Date,
  estimates: ArrivalEstimate[],
  totalDistKm: number
): number {
  // Before first station — runner is at the start
  if (time <= estimates[0].estimatedArrival) {
    return 0
  }

  // After last station
  if (time >= estimates[estimates.length - 1].estimatedArrival) {
    return totalDistKm
  }

  // Find surrounding stations
  for (let i = 1; i < estimates.length; i++) {
    const prev = estimates[i - 1]
    const next = estimates[i]

    if (time >= prev.estimatedArrival && time <= next.estimatedArrival) {
      const segmentMs = next.estimatedArrival.getTime() - prev.estimatedArrival.getTime()
      if (segmentMs === 0) return 0
      const ratio = (time.getTime() - prev.estimatedArrival.getTime()) / segmentMs

      // Get km distances from elapsedMinutes (convert via pace)
      const prevDistKm = prev.elapsedMinutes / 60 * (totalDistKm / (estimates[estimates.length - 1].elapsedMinutes / 60))
      const nextDistKm = next.elapsedMinutes / 60 * (totalDistKm / (estimates[estimates.length - 1].elapsedMinutes / 60))

      return prevDistKm + ratio * (nextDistKm - prevDistKm)
    }
  }

  return 0
}

function interpolatePosition(
  distKm: number,
  cumDist: number[],
  trackPoints: TrackPoint[]
): { lat: number; lon: number } {
  if (distKm <= 0) return { lat: trackPoints[0].lat, lon: trackPoints[0].lon }
  if (distKm >= cumDist[cumDist.length - 1]) {
    return { lat: trackPoints[trackPoints.length - 1].lat, lon: trackPoints[trackPoints.length - 1].lon }
  }

  for (let i = 1; i < cumDist.length; i++) {
    if (distKm <= cumDist[i]) {
      const segLen = cumDist[i] - cumDist[i - 1]
      const ratio = segLen === 0 ? 0 : (distKm - cumDist[i - 1]) / segLen
      const lat = trackPoints[i - 1].lat + ratio * (trackPoints[i].lat - trackPoints[i - 1].lat)
      const lon = trackPoints[i - 1].lon + ratio * (trackPoints[i].lon - trackPoints[i - 1].lon)
      return { lat, lon }
    }
  }

  return { lat: trackPoints[trackPoints.length - 1].lat, lon: trackPoints[trackPoints.length - 1].lon }
}
