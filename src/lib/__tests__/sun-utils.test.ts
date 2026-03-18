import { describe, it, expect } from 'vitest'
import { computeSunConditions } from '@/lib/sun-utils'
import type { Section } from '@/types/section'
import type { AidStation } from '@/types/gpx'

const LAT = 37.7749  // San Francisco
const LON = -122.4194

const makeStation = (order: number, distanceKm: number): AidStation => ({
  order,
  name: `Station ${order}`,
  lat: LAT,
  lon: LON,
  distanceFromStart: distanceKm,
  distanceFromPrev: distanceKm,
  elevationGain: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

function makeSection(
  departureTime: Date,
  arrivalTime: Date,
  fromKm = 0,
  toKm = 10
): Section {
  return {
    fromStation: makeStation(0, fromKm),
    toStation: makeStation(1, toKm),
    distanceMiles: toKm * 0.621371,
    distanceKm: toKm - fromKm,
    durationMinutes: (arrivalTime.getTime() - departureTime.getTime()) / 60000,
    departureTime,
    arrivalTime,
    refillStops: 0,
    tempAtDeparture: null,
    tempAtArrival: null,
    tempDelta: null,
    hasNight: false,
    hasSunsetOrSunrise: false,
    elevationGainFt: null,
    elevationLossFt: null,
  }
}

describe('computeSunConditions', () => {
  it('returns hasNight: false when no pace set', () => {
    const section: Section = {
      ...makeSection(new Date(), new Date()),
      departureTime: null,
      arrivalTime: null,
    }
    const result = computeSunConditions(section, LAT, LON)
    expect(result.hasNight).toBe(false)
    expect(result.sunriseAt).toBeUndefined()
    expect(result.sunsetAt).toBeUndefined()
  })

  it('detects night running for a midnight section', () => {
    // 11 PM to 3 AM — crosses midnight, definitely has darkness
    const departure = new Date('2024-06-15T23:00:00-07:00')
    const arrival = new Date('2024-06-16T03:00:00-07:00')
    const section = makeSection(departure, arrival)
    const result = computeSunConditions(section, LAT, LON)
    expect(result.hasNight).toBe(true)
  })

  it('detects no night for a midday section', () => {
    // 10 AM to 2 PM — daytime in SF in June
    const departure = new Date('2024-06-15T10:00:00-07:00')
    const arrival = new Date('2024-06-15T14:00:00-07:00')
    const section = makeSection(departure, arrival)
    const result = computeSunConditions(section, LAT, LON)
    expect(result.hasNight).toBe(false)
    expect(result.sunriseAt).toBeUndefined()
    expect(result.sunsetAt).toBeUndefined()
  })

  it('detects sunrise within section window', () => {
    // 5 AM to 9 AM in SF in June — sunrise is around 5:45 AM
    const departure = new Date('2024-06-15T05:00:00-07:00')
    const arrival = new Date('2024-06-15T09:00:00-07:00')
    const section = makeSection(departure, arrival, 0, 16)
    const result = computeSunConditions(section, LAT, LON)
    expect(result.sunriseAt).toBeDefined()
    expect(result.sunriseAt!.sectionMile).toBeGreaterThan(0)
    expect(result.sunriseAt!.sectionMile).toBeLessThan(16 * 0.621371)
  })

  it('detects sunset within section window', () => {
    // 7 PM to 10 PM in SF in June — sunset is around 8:30 PM
    const departure = new Date('2024-06-15T19:00:00-07:00')
    const arrival = new Date('2024-06-15T22:00:00-07:00')
    const section = makeSection(departure, arrival, 0, 20)
    const result = computeSunConditions(section, LAT, LON)
    expect(result.sunsetAt).toBeDefined()
    expect(result.sunsetAt!.sectionMile).toBeGreaterThan(0)
    expect(result.sunsetAt!.sectionMile).toBeLessThan(20 * 0.621371)
  })
})
