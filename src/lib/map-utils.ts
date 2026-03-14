import type { TrackPoint, AidStation } from '@/types/gpx'

export interface GeoJSONLineStringFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: [number, number, number][]
  }
  properties: Record<string, unknown>
}

export interface GeoJSONPoint {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number, number]
  }
  properties: {
    name: string
    order: number
    distanceFromStart: number
    hasDropBag: boolean
    hasCrewAccess: boolean
  }
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONPoint[]
}

export interface LngLatBounds {
  sw: [number, number]
  ne: [number, number]
}

export function trackToGeoJSON(trackPoints: TrackPoint[]): GeoJSONLineStringFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: trackPoints.map((pt) => [pt.lon, pt.lat, pt.ele]),
    },
    properties: {},
  }
}

export function aidStationsToGeoJSON(aidStations: AidStation[]): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: aidStations.map((station) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [station.lon, station.lat, station.elevationGain],
      },
      properties: {
        name: station.name,
        order: station.order,
        distanceFromStart: station.distanceFromStart,
        hasDropBag: station.hasDropBag,
        hasCrewAccess: station.hasCrewAccess,
      },
    })),
  }
}

export function getBounds(trackPoints: TrackPoint[]): LngLatBounds {
  if (trackPoints.length === 0) {
    return { sw: [0, 0], ne: [0, 0] }
  }

  let minLat = trackPoints[0].lat
  let maxLat = trackPoints[0].lat
  let minLon = trackPoints[0].lon
  let maxLon = trackPoints[0].lon

  for (const pt of trackPoints) {
    if (pt.lat < minLat) minLat = pt.lat
    if (pt.lat > maxLat) maxLat = pt.lat
    if (pt.lon < minLon) minLon = pt.lon
    if (pt.lon > maxLon) maxLon = pt.lon
  }

  return {
    sw: [minLon, minLat],
    ne: [maxLon, maxLat],
  }
}
