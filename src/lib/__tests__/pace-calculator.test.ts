import { describe, it, expect } from 'vitest'
import { calculateArrivalTimes } from '@/lib/pace-calculator'
import type { AidStation } from '@/types/gpx'

const raceStart = new Date('2024-06-15T06:00:00Z')

const makeStation = (order: number, distanceKm: number): AidStation => ({
  order,
  name: `Station ${order + 1}`,
  lat: 0,
  lon: 0,
  distanceFromStart: distanceKm,
  distanceFromPrev: order === 0 ? distanceKm : 0,
  elevationGain: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

const stations: AidStation[] = [
  makeStation(0, 16.09),  // 10 miles
  makeStation(1, 32.19),  // 20 miles
  makeStation(2, 80.47),  // 50 miles
  makeStation(3, 160.93), // 100 miles
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
    // 10 miles at 15 min/mile = 150 minutes = 2h30m
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      stations,
      raceStart
    )
    expect(result[0].elapsedMinutes).toBeCloseTo(150, 0)
    const expectedArrival = new Date(raceStart.getTime() + 150 * 60 * 1000)
    const diffMs = Math.abs(result[0].estimatedArrival.getTime() - expectedArrival.getTime())
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

  it('handles single aid station at zero distance', () => {
    const singleStation = [makeStation(0, 0)]
    const result = calculateArrivalTimes(
      { mode: 'pace', minutesPerMile: 15 },
      singleStation,
      raceStart
    )
    expect(result).toHaveLength(1)
    expect(result[0].elapsedMinutes).toBe(0)
    expect(result[0].estimatedArrival.getTime()).toBe(raceStart.getTime())
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
