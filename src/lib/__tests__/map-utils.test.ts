import { describe, it, expect } from 'vitest'
import { trackToGeoJSON, aidStationsToGeoJSON, getBounds } from '@/lib/map-utils'
import type { TrackPoint, AidStation } from '@/types/gpx'

const sampleTrackPoints: TrackPoint[] = [
  { lat: 37.7749, lon: -122.4194, ele: 100 },
  { lat: 37.7800, lon: -122.4150, ele: 150 },
  { lat: 37.7850, lon: -122.4100, ele: 200 },
]

const sampleAidStations: AidStation[] = [
  {
    order: 0,
    name: 'Start',
    lat: 37.7749,
    lon: -122.4194,
    distanceFromStart: 0,
    distanceFromPrev: 0,
    elevationGain: 100,
    hasDropBag: false,
    hasCrewAccess: false,
  },
  {
    order: 1,
    name: 'Mid',
    lat: 37.7800,
    lon: -122.4150,
    distanceFromStart: 5,
    distanceFromPrev: 5,
    elevationGain: 150,
    hasDropBag: true,
    hasCrewAccess: true,
  },
]

describe('trackToGeoJSON', () => {
  it('returns a GeoJSON Feature with LineString geometry', () => {
    const result = trackToGeoJSON(sampleTrackPoints)
    expect(result.type).toBe('Feature')
    expect(result.geometry.type).toBe('LineString')
  })

  it('converts track points to [lon, lat, ele] coordinate format (Mapbox order)', () => {
    const result = trackToGeoJSON(sampleTrackPoints)
    const first = result.geometry.coordinates[0]
    expect(first[0]).toBe(-122.4194) // lon
    expect(first[1]).toBe(37.7749)   // lat
    expect(first[2]).toBe(100)       // ele
  })

  it('preserves all track points', () => {
    const result = trackToGeoJSON(sampleTrackPoints)
    expect(result.geometry.coordinates).toHaveLength(sampleTrackPoints.length)
  })

  it('returns empty coordinates for empty input', () => {
    const result = trackToGeoJSON([])
    expect(result.geometry.coordinates).toHaveLength(0)
  })
})

describe('aidStationsToGeoJSON', () => {
  it('returns a GeoJSON FeatureCollection', () => {
    const result = aidStationsToGeoJSON(sampleAidStations)
    expect(result.type).toBe('FeatureCollection')
    expect(Array.isArray(result.features)).toBe(true)
  })

  it('creates one Feature per aid station', () => {
    const result = aidStationsToGeoJSON(sampleAidStations)
    expect(result.features).toHaveLength(sampleAidStations.length)
  })

  it('each feature has Point geometry with [lon, lat] order', () => {
    const result = aidStationsToGeoJSON(sampleAidStations)
    const first = result.features[0]
    expect(first.geometry.type).toBe('Point')
    expect(first.geometry.coordinates[0]).toBe(-122.4194) // lon
    expect(first.geometry.coordinates[1]).toBe(37.7749)   // lat
  })

  it('includes station name and metadata in properties', () => {
    const result = aidStationsToGeoJSON(sampleAidStations)
    const second = result.features[1]
    expect(second.properties.name).toBe('Mid')
    expect(second.properties.hasDropBag).toBe(true)
    expect(second.properties.hasCrewAccess).toBe(true)
    expect(second.properties.distanceFromStart).toBe(5)
  })
})

describe('getBounds', () => {
  it('returns sw/ne bounding box', () => {
    const bounds = getBounds(sampleTrackPoints)
    expect(bounds).toHaveProperty('sw')
    expect(bounds).toHaveProperty('ne')
  })

  it('sw is the min lat/lon and ne is the max', () => {
    const bounds = getBounds(sampleTrackPoints)
    expect(bounds.sw[0]).toBe(-122.4194) // min lon
    expect(bounds.sw[1]).toBe(37.7749)   // min lat
    expect(bounds.ne[0]).toBe(-122.4100) // max lon
    expect(bounds.ne[1]).toBe(37.7850)   // max lat
  })

  it('handles single point', () => {
    const bounds = getBounds([{ lat: 37.7749, lon: -122.4194, ele: 100 }])
    expect(bounds.sw).toEqual(bounds.ne)
  })

  it('handles empty input with zero bounds', () => {
    const bounds = getBounds([])
    expect(bounds.sw).toEqual([0, 0])
    expect(bounds.ne).toEqual([0, 0])
  })
})
