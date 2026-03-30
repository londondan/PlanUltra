export interface DriveSegment {
  durationText: string
  distanceText: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344
  return `${miles.toFixed(1)} mi`
}

export async function getDriveSegment(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<DriveSegment | null> {
  // Uses the existing Mapbox token — no additional API key required.
  // Mapbox Directions API is free up to 100k requests/month.
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    `?access_token=${token}`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) return null
    return {
      durationText: formatDuration(route.duration as number),
      distanceText: formatDistance(route.distance as number),
    }
  } catch {
    return null
  }
}
