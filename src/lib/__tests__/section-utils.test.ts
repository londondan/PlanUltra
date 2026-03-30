import { describe, it, expect } from 'vitest'
import { computeSections } from '@/lib/section-utils'
import type { AidStation, TrackPoint } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { RaceWeatherEntry } from '@/lib/weather-timeline'

const raceStart = new Date('2024-06-15T06:00:00Z')

function makeStation(
  order: number,
  distanceFromStart: number,
  opts: Partial<AidStation> = {}
): AidStation {
  const { grossClimbM = 0, grossDescentM = 0, ...rest } = opts

  return {
    order,
    name: `Station ${order}`,
    lat: 0,
    lon: 0,
    distanceFromStart,
    distanceFromPrev: 0,
    elevationGain: 0,
    grossClimbM,
    grossDescentM,
    hasDropBag: false,
    hasCrewAccess: false,
    ...rest,
  }
}

function makeArrival(order: number, elapsedMinutes: number): ArrivalEstimate {
  return {
    order,
    name: `Station ${order}`,
    estimatedArrival: new Date(raceStart.getTime() + elapsedMinutes * 60_000),
    elapsedMinutes,
  }
}

function makeWeather(elapsedHours: number, temperature: number, isNight = false): RaceWeatherEntry {
  return {
    hour: new Date(raceStart.getTime() + elapsedHours * 3_600_000).toISOString(),
    locationLat: 0,
    locationLon: 0,
    temperature,
    precipitationProbability: 0,
    windSpeed: 0,
    weatherCode: 0,
    isNight,
    elapsedHours,
  }
}

describe('computeSections', () => {
  it('returns [] when fewer than 2 drop-bag / boundary stations', () => {
    const stations = [
      makeStation(0, 0),
      makeStation(1, 10),
      makeStation(2, 20),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result).toEqual([])
  })

  it('returns 2 sections for Start + 1 drop-bag + Finish', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 20, { hasDropBag: true }),
      makeStation(2, 40, { isFinish: true }),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result).toHaveLength(2)
  })

  it('returns 1 section for Start + Finish only', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 40, { isFinish: true }),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result).toHaveLength(1)
  })

  it('counts refill stops correctly', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 10),  // non-drop-bag
      makeStation(2, 20, { isFinish: true }),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result[0].refillStops).toBe(1)
  })

  it('sets durationMinutes and temps to null when no arrival estimates', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 20, { isFinish: true }),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result[0].durationMinutes).toBeNull()
    expect(result[0].tempAtDeparture).toBeNull()
    expect(result[0].hasNight).toBe(false)
  })

  it('calculates distanceMiles ≈ distanceKm * 0.621371', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 32, { isFinish: true }),
    ]
    const result = computeSections(stations, [], [], [], raceStart)
    expect(result[0].distanceMiles).toBeCloseTo(result[0].distanceKm * 0.621371, 5)
  })

  it('sets hasNight true when a weather entry in the window is night', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 20, { isFinish: true }),
    ]
    const arrivals = [makeArrival(0, 0), makeArrival(1, 120)]
    const weather = [
      makeWeather(0, 60, false),
      makeWeather(1, 55, true),
      makeWeather(2, 50, true),
    ]
    const result = computeSections(stations, arrivals, weather, [], raceStart)
    expect(result[0].hasNight).toBe(true)
  })

  it('sets elevationGainFt to null when all ele values are 0', () => {
    const stations = [
      makeStation(0, 0, { isStart: true }),
      makeStation(1, 10, { isFinish: true }),
    ]
    const trackPoints: TrackPoint[] = [
      { lat: 0, lon: 0, ele: 0 },
      { lat: 0, lon: 0.1, ele: 0 },
      { lat: 0, lon: 0.2, ele: 0 },
    ]
    const result = computeSections(stations, [], [], trackPoints, raceStart)
    expect(result[0].elevationGainFt).toBeNull()
    expect(result[0].elevationLossFt).toBeNull()
  })
})
