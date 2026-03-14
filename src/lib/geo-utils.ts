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
