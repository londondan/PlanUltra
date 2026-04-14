import type { TrackPoint } from '@/types/gpx'

interface LatLon {
  lat: number
  lon: number
}

const EARTH_RADIUS_KM = 6371

export function haversineDistance(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function cumulativeDistances(trackPoints: LatLon[]): number[] {
  const distances: number[] = [0]
  for (let i = 1; i < trackPoints.length; i++) {
    const d = haversineDistance(trackPoints[i - 1], trackPoints[i])
    distances.push(distances[i - 1] + d)
  }
  return distances
}

export function interpolateAtDistance(
  distKm: number,
  cumDist: number[],
  trackPoints: TrackPoint[]
): { lat: number; lon: number; ele: number } {
  if (distKm <= 0) return { lat: trackPoints[0].lat, lon: trackPoints[0].lon, ele: trackPoints[0].ele }
  const last = trackPoints.length - 1
  if (distKm >= cumDist[last]) {
    return { lat: trackPoints[last].lat, lon: trackPoints[last].lon, ele: trackPoints[last].ele }
  }
  for (let i = 1; i < cumDist.length; i++) {
    if (distKm <= cumDist[i]) {
      const segLen = cumDist[i] - cumDist[i - 1]
      const ratio = segLen === 0 ? 0 : (distKm - cumDist[i - 1]) / segLen
      return {
        lat: trackPoints[i - 1].lat + ratio * (trackPoints[i].lat - trackPoints[i - 1].lat),
        lon: trackPoints[i - 1].lon + ratio * (trackPoints[i].lon - trackPoints[i - 1].lon),
        ele: trackPoints[i - 1].ele + ratio * (trackPoints[i].ele - trackPoints[i - 1].ele),
      }
    }
  }
  return { lat: trackPoints[last].lat, lon: trackPoints[last].lon, ele: trackPoints[last].ele }
}

export function computeSegmentElevation(
  trackPoints: TrackPoint[],
  cumDist: number[],
  fromKm: number,
  toKm: number
): { grossClimbM: number; grossDescentM: number } {
  const NOISE_THRESHOLD_M = 2
  let grossClimbM = 0
  let grossDescentM = 0
  for (let i = 1; i < trackPoints.length; i++) {
    if (cumDist[i] < fromKm) continue
    if (cumDist[i - 1] > toKm) break
    const delta = trackPoints[i].ele - trackPoints[i - 1].ele
    if (Math.abs(delta) > NOISE_THRESHOLD_M) {
      if (delta > 0) grossClimbM += delta
      else grossDescentM += Math.abs(delta)
    }
  }
  return { grossClimbM, grossDescentM }
}

export function segmentDistances(
  aidStations: LatLon[]
): { fromStart: number; fromPrev: number }[] {
  const result: { fromStart: number; fromPrev: number }[] = []
  let cumulative = 0

  for (let i = 0; i < aidStations.length; i++) {
    const fromPrev =
      i === 0 ? 0 : haversineDistance(aidStations[i - 1], aidStations[i])
    cumulative += fromPrev
    result.push({ fromStart: cumulative, fromPrev })
  }

  return result
}
