export interface DriveSegment {
  durationText: string
  distanceText: string
}

export interface Coordinates {
  lat: number
  lng: number
}

export type ResolvedCoords =
  | { ok: true; coords: Coordinates }
  | { ok: false; reason: 'invalid_format' | 'unresolvable_short_link' | 'coords_not_found' }

const GOOGLE_MAPS_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'goo.gl',
  'maps.app.goo.gl',
])

function isValidCoordinates(lat: number, lng: number): boolean {
  return !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function parseCoordinateString(input: string): Coordinates | null {
  const parts = input.trim().split(',')
  if (parts.length !== 2) return null

  const lat = parseFloat(parts[0].trim())
  const lng = parseFloat(parts[1].trim())
  if (!isValidCoordinates(lat, lng)) return null

  return { lat, lng }
}

function isGoogleMapsHost(hostname: string): boolean {
  return GOOGLE_MAPS_HOSTS.has(hostname.toLowerCase())
}

function isGoogleMapsShortHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'maps.app.goo.gl' || normalized === 'goo.gl'
}

function parseCoordsFromCandidate(value: string | null): Coordinates | null {
  return value ? parseCoordinateString(value) : null
}

export function extractCoordsFromGoogleMapsUrl(input: string | URL): Coordinates | null {
  const url = input instanceof URL ? input : new URL(input)
  if (!isGoogleMapsHost(url.hostname)) return null

  const queryParamKeys = ['q', 'query', 'll', 'center', 'destination']
  for (const key of queryParamKeys) {
    const coords = parseCoordsFromCandidate(url.searchParams.get(key))
    if (coords) return coords
  }

  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const coords = parseCoordinateString(`${atMatch[1]},${atMatch[2]}`)
    if (coords) return coords
  }

  const encodedMatch = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (encodedMatch) {
    const coords = parseCoordinateString(`${encodedMatch[1]},${encodedMatch[2]}`)
    if (coords) return coords
  }

  return null
}

export async function resolveGoogleMapsInput(
  input: string,
  fetchImpl: typeof fetch = fetch
): Promise<ResolvedCoords> {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, reason: 'invalid_format' }
  }

  const rawCoords = parseCoordinateString(trimmed)
  if (rawCoords) {
    return { ok: true, coords: rawCoords }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'invalid_format' }
  }

  if (!isGoogleMapsHost(url.hostname)) {
    return { ok: false, reason: 'invalid_format' }
  }

  if (!isGoogleMapsShortHost(url.hostname)) {
    const coords = extractCoordsFromGoogleMapsUrl(url)
    return coords ? { ok: true, coords } : { ok: false, reason: 'coords_not_found' }
  }

  try {
    const response = await fetchImpl(url.toString(), {
      redirect: 'follow',
      cache: 'no-store',
    })

    const finalUrl = new URL(response.url)
    if (!isGoogleMapsHost(finalUrl.hostname) || isGoogleMapsShortHost(finalUrl.hostname)) {
      return { ok: false, reason: 'unresolvable_short_link' }
    }

    const coords = extractCoordsFromGoogleMapsUrl(finalUrl)
    return coords ? { ok: true, coords } : { ok: false, reason: 'coords_not_found' }
  } catch {
    return { ok: false, reason: 'unresolvable_short_link' }
  }
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
