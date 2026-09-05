import { describe, it, expect } from 'vitest'
import { calculateArrivalTimes } from '@/lib/pace-calculator'
import type { AidStation } from '@/types/gpx'

const raceStart = new Date('2024-06-15T06:00:00Z')

const makeStation = (order: number, distanceKm: number, distFromPrev: number): AidStation => ({
  order,
  name: `Station ${order}`,
  lat: 0,
  lon: 0,
  distanceFromStart: distanceKm,
  distanceFromPrev: distFromPrev,
  elevationGain: 0,
  grossClimbM: 0,
  grossDescentM: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

// Includes a start station at km 0 (index 0, anchored to raceStart by the calculator)
const stations: AidStation[] = [
  makeStation(0, 0,      0),      // Start — 0 mi
  makeStation(1, 16.09,  16.09),  // 10 mi — leg: 10 mi
  makeStation(2, 32.19,  16.10),  // 20 mi — leg: 10 mi
  makeStation(3, 80.47,  48.28),  // 50 mi — leg: 30 mi
  makeStation(4, 160.93, 80.46),  // 100 mi — leg: 50 mi
]

describe('calculateArrivalTimes - flat pace mode', () => {
  it('returns one estimate per aid station', () => {
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      stations,
      raceStart
    )
    expect(result).toHaveLength(stations.length)
  })

  it('first station arrives after correct elapsed time', () => {
    // Start (index 0) is anchored to raceStart (elapsed = 0).
    // First real station (index 1) is at 10 miles: 10 × 15 min/mi = 150 min.
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      stations,
      raceStart
    )
    expect(result[1].elapsedMinutes).toBeCloseTo(150, 0)
    const expectedArrival = new Date(raceStart.getTime() + 150 * 60 * 1000)
    const diffMs = Math.abs(result[1].estimatedArrival.getTime() - expectedArrival.getTime())
    expect(diffMs).toBeLessThan(5000) // within 5 seconds
  })

  it('arrival times are monotonically increasing', () => {
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      stations,
      raceStart
    )
    for (let i = 1; i < result.length; i++) {
      expect(result[i].estimatedArrival.getTime()).toBeGreaterThan(
        result[i - 1].estimatedArrival.getTime()
      )
    }
  })

  it('handles multi-day: 100 mile finish time rolls past midnight', () => {
    // At 20 min/mile pace, 100 miles = 33h20m — must go into next day
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 20 },
      stations,
      raceStart
    )
    const finish = result[result.length - 1].estimatedArrival
    const hoursDiff = (finish.getTime() - raceStart.getTime()) / (1000 * 60 * 60)
    expect(hoursDiff).toBeGreaterThan(24)
  })

  it('returns empty array for empty aid stations', () => {
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      [],
      raceStart
    )
    expect(result).toHaveLength(0)
  })

  it('returns empty for a single station at zero distance', () => {
    // A single station at km 0 gives totalMiles = 0; the function returns []
    // to avoid division by zero when computing pace.
    const singleStation = [makeStation(0, 0, 0)]
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      singleStation,
      raceStart
    )
    expect(result).toHaveLength(0)
  })
})

describe('calculateArrivalTimes - finish time mode', () => {
  it('derives pace from target finish time and calculates arrivals', () => {
    // 100 miles in 1500 minutes (25h) = 15 min/mile
    const totalKm = 160.93
    const result = calculateArrivalTimes(
      { mode: 'finish', targetMinutes: 1500, totalDistanceKm: totalKm },
      stations,
      raceStart
    )
    expect(result).toHaveLength(stations.length)
    // Last station (100 miles) should arrive at ~25h
    const finish = result[result.length - 1]
    expect(finish.elapsedMinutes).toBeCloseTo(1500, 0)
  })

  it('returns empty for zero total distance', () => {
    const result = calculateArrivalTimes(
      { mode: 'finish', targetMinutes: 1500, totalDistanceKm: 0 },
      stations,
      raceStart
    )
    expect(result).toHaveLength(0)
  })
})

describe('PaceConfig interface stability', () => {
  it('pace mode has mode and minutesPerMile', () => {
    const config = { mode: 'pace' as const, minutesPerMile: 15 }
    expect(config.mode).toBe('pace')
    expect(config.minutesPerMile).toBe(15)
  })

  it('finish mode has mode, targetMinutes, and totalDistanceKm', () => {
    const config = { mode: 'finish' as const, targetMinutes: 1500, totalDistanceKm: 160 }
    expect(config.mode).toBe('finish')
    expect(config.targetMinutes).toBe(1500)
    expect(config.totalDistanceKm).toBe(160)
  })
})
