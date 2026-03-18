import { describe, it, expect } from 'vitest'
import { alignWeatherToRace } from '@/lib/weather-timeline'
import type { HourlyForecast } from '@/lib/weather-client'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { TrackPoint } from '@/types/gpx'

const raceStart = new Date('2024-06-15T06:00:00Z')

const trackPoints: TrackPoint[] = [
  { lat: 37.7749, lon: -122.4194, ele: 100 },
  { lat: 37.8, lon: -122.4, ele: 150 },
  { lat: 37.85, lon: -122.38, ele: 200 },
]

const arrivalEstimates: ArrivalEstimate[] = [
  {
    order: 0,
    name: 'Aid 1',
    estimatedArrival: new Date('2024-06-15T08:00:00Z'),
    elapsedMinutes: 120,
  },
  {
    order: 1,
    name: 'Finish',
    estimatedArrival: new Date('2024-06-15T14:00:00Z'),
    elapsedMinutes: 480,
  },
]

const generateForecasts = (startHour: number, count: number): HourlyForecast[] =>
  Array.from({ length: count }, (_, i) => {
    const hour = startHour + i
    const time = new Date('2024-06-15T00:00:00Z')
    time.setUTCHours(hour)
    return {
      time: time.toISOString().slice(0, 16) + 'Z',
      temperature: 60 + i,
      precipitationProbability: 10,
      windSpeed: 5,
      weatherCode: 0,
      isNight: hour < 6 || hour >= 20,
    }
  })

// ---------------------------------------------------------------------------
// Regression: interpolateRunnerDistance divide-by-zero
// Before the fix, the "before first station" branch had a dead ratio computation
// (same value minus itself) that was masked by an unconditional `return 0`.
// This test verifies the early hours of the race produce valid, non-NaN entries.
// ---------------------------------------------------------------------------
describe('interpolateRunnerDistance regression', () => {
  it('produces valid (non-NaN) coordinates for hours before the first aid station', () => {
    // Race starts at 06:00, first station not until 08:00
    // Hours 06:00 and 07:00 fall in the "before first station" branch
    const forecasts = generateForecasts(6, 3) // 06:00, 07:00, 08:00
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    // Should have at least 2 entries (06:00 and 07:00 are within the race window)
    expect(result.length).toBeGreaterThanOrEqual(2)

    for (const entry of result) {
      expect(entry.locationLat).not.toBeNaN()
      expect(entry.locationLon).not.toBeNaN()
      expect(entry.elapsedHours).toBeGreaterThanOrEqual(0)
    }
  })

  it('maps the race start hour to track point 0 coordinates', () => {
    const forecasts = generateForecasts(6, 1) // just 06:00 = race start
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    expect(result).toHaveLength(1)
    // Runner is at the start — should be at (or very near) trackPoints[0]
    expect(result[0].locationLat).toBeCloseTo(trackPoints[0].lat, 4)
    expect(result[0].locationLon).toBeCloseTo(trackPoints[0].lon, 4)
  })
})

describe('alignWeatherToRace', () => {
  it('returns empty array when forecasts are empty', () => {
    const result = alignWeatherToRace([], arrivalEstimates, trackPoints, raceStart)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when arrival estimates are empty', () => {
    const forecasts = generateForecasts(6, 8)
    const result = alignWeatherToRace(forecasts, [], trackPoints, raceStart)
    expect(result).toHaveLength(0)
  })

  it('only includes hours within the race window', () => {
    const forecasts = generateForecasts(0, 24) // midnight to midnight
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    for (const entry of result) {
      const t = new Date(entry.hour)
      expect(t.getTime()).toBeGreaterThanOrEqual(raceStart.getTime())
      expect(t.getTime()).toBeLessThanOrEqual(
        arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival.getTime()
      )
    }
  })

  it('each entry has location coordinates within track bounds', () => {
    const forecasts = generateForecasts(6, 8)
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    for (const entry of result) {
      expect(entry.locationLat).toBeGreaterThanOrEqual(37.7)
      expect(entry.locationLat).toBeLessThanOrEqual(38.0)
      expect(entry.locationLon).toBeGreaterThanOrEqual(-122.5)
      expect(entry.locationLon).toBeLessThanOrEqual(-122.3)
    }
  })

  it('includes weather data in each entry', () => {
    const forecasts = generateForecasts(6, 8)
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    if (result.length > 0) {
      const entry = result[0]
      expect(entry).toHaveProperty('temperature')
      expect(entry).toHaveProperty('precipitationProbability')
      expect(entry).toHaveProperty('windSpeed')
      expect(entry).toHaveProperty('weatherCode')
      expect(entry).toHaveProperty('isNight')
      expect(entry).toHaveProperty('elapsedHours')
    }
  })

  it('elapsedHours is non-negative for all entries', () => {
    const forecasts = generateForecasts(6, 8)
    const result = alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)

    for (const entry of result) {
      expect(entry.elapsedHours).toBeGreaterThanOrEqual(0)
    }
  })
})
