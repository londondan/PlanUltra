import { describe, it, expect } from 'vitest'
import { haversineDistance, cumulativeDistances, segmentDistances } from '@/lib/geo-utils'

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance({ lat: 51.5, lon: -0.1 }, { lat: 51.5, lon: -0.1 })).toBe(0)
  })

  it('calculates approximate distance between two known points', () => {
    // London to Paris is roughly 340 km
    const london = { lat: 51.5074, lon: -0.1278 }
    const paris = { lat: 48.8566, lon: 2.3522 }
    const dist = haversineDistance(london, paris)
    expect(dist).toBeGreaterThan(330)
    expect(dist).toBeLessThan(350)
  })

  it('is symmetric', () => {
    const a = { lat: 37.7749, lon: -122.4194 }
    const b = { lat: 37.8, lon: -122.3 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 5)
  })

  it('returns values in kilometers', () => {
    // 1 degree of latitude ≈ 111 km
    const a = { lat: 0, lon: 0 }
    const b = { lat: 1, lon: 0 }
    const dist = haversineDistance(a, b)
    expect(dist).toBeGreaterThan(110)
    expect(dist).toBeLessThan(112)
  })
})

describe('cumulativeDistances', () => {
  it('returns [0] for a single point', () => {
    const result = cumulativeDistances([{ lat: 37.7, lon: -122.4 }])
    expect(result).toEqual([0])
  })

  it('starts at 0 and increases monotonically', () => {
    const points = [
      { lat: 37.7749, lon: -122.4194 },
      { lat: 37.7760, lon: -122.4180 },
      { lat: 37.7850, lon: -122.4100 },
    ]
    const dists = cumulativeDistances(points)

    expect(dists[0]).toBe(0)
    expect(dists[1]).toBeGreaterThan(0)
    expect(dists[2]).toBeGreaterThan(dists[1])
  })

  it('returns an array with same length as input', () => {
    const points = Array.from({ length: 5 }, (_, i) => ({ lat: i, lon: 0 }))
    expect(cumulativeDistances(points)).toHaveLength(5)
  })
})

describe('segmentDistances', () => {
  it('returns fromStart=0 and fromPrev=0 for first station', () => {
    const stations = [
      { lat: 37.7749, lon: -122.4194 },
      { lat: 37.8, lon: -122.4 },
    ]
    const result = segmentDistances(stations)
    expect(result[0].fromStart).toBe(0)
    expect(result[0].fromPrev).toBe(0)
  })

  it('fromStart equals sum of fromPrev values up to that station', () => {
    const stations = [
      { lat: 37.7749, lon: -122.4194 },
      { lat: 37.78, lon: -122.41 },
      { lat: 37.79, lon: -122.40 },
    ]
    const result = segmentDistances(stations)

    expect(result[1].fromStart).toBeCloseTo(result[0].fromPrev + result[1].fromPrev, 5)
    expect(result[2].fromStart).toBeCloseTo(
      result[0].fromPrev + result[1].fromPrev + result[2].fromPrev,
      5
    )
  })

  it('distance between consecutive stations matches haversine', () => {
    const a = { lat: 37.7749, lon: -122.4194 }
    const b = { lat: 37.8, lon: -122.4 }
    const result = segmentDistances([a, b])
    expect(result[1].fromPrev).toBeCloseTo(haversineDistance(a, b), 5)
  })
})
