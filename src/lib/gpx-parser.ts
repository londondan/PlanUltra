import { XMLParser } from 'fast-xml-parser'
import type { TrackPoint, Waypoint, AidStation, ParsedGPX } from '@/types/gpx'
import { haversineDistance } from '@/lib/geo-utils'

const PROXIMITY_THRESHOLD_KM = 0.2
const MIN_VISIT_SEPARATION_KM = 1.0
const LOOP_DETECTION_THRESHOLD_KM = 0.5

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['trkpt', 'trkseg', 'wpt'].includes(name),
})

function parseTrkpt(pt: Record<string, unknown>): TrackPoint {
  return {
    lat: parseFloat(String(pt['@_lat'])),
    lon: parseFloat(String(pt['@_lon'])),
    ele: parseFloat(String(pt['ele'] ?? 0)),
    time: pt['time'] ? String(pt['time']) : undefined,
  }
}

function parseWpt(wpt: Record<string, unknown>): Waypoint {
  return {
    lat: parseFloat(String(wpt['@_lat'])),
    lon: parseFloat(String(wpt['@_lon'])),
    ele: parseFloat(String(wpt['ele'] ?? 0)),
    name: String(wpt['name'] ?? 'Unnamed'),
  }
}

export function parseGPX(gpxString: string): ParsedGPX {
  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(gpxString) as Record<string, unknown>
  } catch {
    throw new Error('Invalid GPX: failed to parse XML')
  }

  const gpx = parsed['gpx'] as Record<string, unknown>
  if (!gpx) {
    throw new Error('Invalid GPX: missing <gpx> root element')
  }

  // Extract waypoints
  const rawWpts = (gpx['wpt'] as Record<string, unknown>[] | undefined) ?? []
  const waypoints: Waypoint[] = rawWpts.map(parseWpt)

  // Extract track points (may have multiple tracks and segments)
  const trackPoints: TrackPoint[] = []
  const tracks = gpx['trk']
  if (!tracks) {
    throw new Error('Invalid GPX: no <trk> element found')
  }

  const trkArray = Array.isArray(tracks)
    ? (tracks as Record<string, unknown>[])
    : [tracks as Record<string, unknown>]

  for (const trk of trkArray) {
    const segments = trk['trkseg']
    if (!segments) continue

    const segArray = Array.isArray(segments)
      ? (segments as Record<string, unknown>[])
      : [segments as Record<string, unknown>]

    for (const seg of segArray) {
      const pts = seg['trkpt']
      if (!pts) continue

      const ptArray = Array.isArray(pts)
        ? (pts as Record<string, unknown>[])
        : [pts as Record<string, unknown>]

      for (const pt of ptArray) {
        trackPoints.push(parseTrkpt(pt))
      }
    }
  }

  if (trackPoints.length === 0) {
    throw new Error('Invalid GPX: no track points found')
  }

  return { trackPoints, waypoints }
}

interface Visit {
  distanceFromStart: number
  trackPointIndex: number
}

function findAllVisits(
  waypoint: Waypoint,
  trackPoints: TrackPoint[],
  cumDist: number[]
): Visit[] {
  // Collect indices of track points within proximity threshold
  const nearIndices: number[] = []
  for (let i = 0; i < trackPoints.length; i++) {
    if (haversineDistance(waypoint, trackPoints[i]) < PROXIMITY_THRESHOLD_KM) {
      nearIndices.push(i)
    }
  }

  if (nearIndices.length === 0) return []

  // Cluster adjacent near indices; a gap >= MIN_VISIT_SEPARATION_KM splits clusters
  const clusters: number[][] = [[nearIndices[0]]]
  for (let j = 1; j < nearIndices.length; j++) {
    const prev = nearIndices[j - 1]
    const curr = nearIndices[j]
    if (cumDist[curr] - cumDist[prev] >= MIN_VISIT_SEPARATION_KM) {
      clusters.push([])
    }
    clusters[clusters.length - 1].push(curr)
  }

  // Pick representative per cluster (track point closest to waypoint)
  return clusters.map((cluster) => {
    let bestIdx = cluster[0]
    let bestDist = haversineDistance(waypoint, trackPoints[bestIdx])
    for (const idx of cluster) {
      const d = haversineDistance(waypoint, trackPoints[idx])
      if (d < bestDist) {
        bestDist = d
        bestIdx = idx
      }
    }
    return { distanceFromStart: cumDist[bestIdx], trackPointIndex: bestIdx }
  })
}

interface RawStop {
  name: string
  physicalName: string
  lat: number
  lon: number
  distanceFromStart: number
  elevationGain: number
  hasDropBag: boolean
  hasCrewAccess: boolean
  isStart?: boolean
  isFinish?: boolean
}

/**
 * Merges waypoints that are at the same location (within PROXIMITY_THRESHOLD_KM).
 * When multiple waypoints are close together, combines their names and returns deduplicated list.
 * Keeps the first waypoint encountered and merges names from subsequent ones.
 */
function deduplicateWaypoints(waypoints: Waypoint[]): Waypoint[] {
  if (waypoints.length === 0) return []

  const merged: Waypoint[] = []
  const visited = new Set<number>()

  for (let i = 0; i < waypoints.length; i++) {
    if (visited.has(i)) continue

    const current = waypoints[i]
    const nearbyNames = [current.name]
    visited.add(i)

    // Find all waypoints close to this one
    for (let j = i + 1; j < waypoints.length; j++) {
      if (!visited.has(j)) {
        if (haversineDistance(current, waypoints[j]) < PROXIMITY_THRESHOLD_KM) {
          nearbyNames.push(waypoints[j].name)
          visited.add(j)
        }
      }
    }

    // If multiple names at same location, combine them
    const mergedName = nearbyNames.length > 1 ? nearbyNames.join(' / ') : current.name

    merged.push({
      ...current,
      name: mergedName,
    })
  }

  return merged
}

/**
 * Detects if a waypoint is at the start location.
 * Returns the waypoint if found within PROXIMITY_THRESHOLD_KM of the track start, else null.
 */
function findStartWaypoint(
  waypoints: Waypoint[],
  trackStart: TrackPoint
): Waypoint | null {
  for (const wpt of waypoints) {
    if (haversineDistance(wpt, trackStart) < PROXIMITY_THRESHOLD_KM) {
      return wpt
    }
  }
  return null
}

/**
 * Detects if a waypoint is at the finish location.
 * Returns the waypoint if found within PROXIMITY_THRESHOLD_KM of the track end, else null.
 */
function findFinishWaypoint(
  waypoints: Waypoint[],
  trackEnd: TrackPoint
): Waypoint | null {
  for (const wpt of waypoints) {
    if (haversineDistance(wpt, trackEnd) < PROXIMITY_THRESHOLD_KM) {
      return wpt
    }
  }
  return null
}

/**
 * Extracts aid stations showing every visit in order.
 * Used for the race pace/planning table where a runner will visit the same station multiple times.
 * Returns all stops (including Start/Finish markers) sorted by distance from start.
 * 
 * Deduplicates: if a waypoint is at the start or finish location, it replaces the synthetic marker.
 * Result: each physical location appears exactly once in the output.
 */
export function extractAidStations(
  waypoints: Waypoint[],
  trackPoints: TrackPoint[]
): AidStation[] {
  if (trackPoints.length === 0) return []

  // Deduplicate waypoints that are at the same location
  const deduplicatedWaypoints = deduplicateWaypoints(waypoints)

  // Build cumulative distances along track
  const cumDist: number[] = [0]
  for (let i = 1; i < trackPoints.length; i++) {
    const d = haversineDistance(trackPoints[i - 1], trackPoints[i])
    cumDist.push(cumDist[i - 1] + d)
  }
  const totalDist = cumDist[cumDist.length - 1]

  // Detect loop course (start and end within threshold)
  const isLoop =
    haversineDistance(trackPoints[0], trackPoints[trackPoints.length - 1]) <
    LOOP_DETECTION_THRESHOLD_KM

  // Auto-detect start/finish waypoints at course boundaries
  const startWpt = findStartWaypoint(deduplicatedWaypoints, trackPoints[0])
  const finishWpt = isLoop ? startWpt : findFinishWaypoint(deduplicatedWaypoints, trackPoints[trackPoints.length - 1])

  const stops: RawStop[] = []

  // Only add synthetic Start if there's no waypoint at the start location
  if (!startWpt) {
    stops.push({
      name: 'Start',
      physicalName: 'Start',
      lat: trackPoints[0].lat,
      lon: trackPoints[0].lon,
      distanceFromStart: 0,
      elevationGain: 0,
      hasDropBag: false,
      hasCrewAccess: false,
      isStart: true,
    })
  }

  // Collect all visits for each waypoint
  for (const wpt of deduplicatedWaypoints) {
    const visits = findAllVisits(wpt, trackPoints, cumDist)
    for (const visit of visits) {
      const isWptStart = startWpt === wpt && visit.distanceFromStart < PROXIMITY_THRESHOLD_KM
      const isWptFinish = finishWpt === wpt && Math.abs(visit.distanceFromStart - totalDist) < PROXIMITY_THRESHOLD_KM
      
      stops.push({
        name: wpt.name,
        physicalName: wpt.name,
        lat: wpt.lat,
        lon: wpt.lon,
        distanceFromStart: visit.distanceFromStart,
        elevationGain: 0,
        hasDropBag: false,
        hasCrewAccess: false,
        isStart: isWptStart,
        isFinish: isWptFinish,
      })
    }
  }

  // Only add synthetic Finish if there's no waypoint at the finish location
  if (!finishWpt) {
    const finishName = isLoop ? 'Start/Finish' : 'Finish'
    stops.push({
      name: finishName,
      physicalName: finishName,
      lat: trackPoints[trackPoints.length - 1].lat,
      lon: trackPoints[trackPoints.length - 1].lon,
      distanceFromStart: totalDist,
      elevationGain: 0,
      hasDropBag: false,
      hasCrewAccess: false,
      isFinish: true,
    })
  }

  // Sort by distance; at equal distance: Start first, Finish last
  stops.sort((a, b) => {
    if (a.distanceFromStart !== b.distanceFromStart) {
      return a.distanceFromStart - b.distanceFromStart
    }
    if (a.isStart) return -1
    if (b.isStart) return 1
    if (a.isFinish) return 1
    if (b.isFinish) return -1
    return 0
  })

  // Assign order, visitNumber, distanceFromPrev
  const visitCounts = new Map<string, number>()
  const stations: AidStation[] = stops.map((stop, i) => {
    const count = (visitCounts.get(stop.physicalName) ?? 0) + 1
    visitCounts.set(stop.physicalName, count)
    return {
      ...stop,
      order: i,
      visitNumber: count,
      distanceFromPrev: 0,
    }
  })

  // Identify which stations are start/finish to flag all their visits
  const startFinishPhysicalNames = new Set<string>()
  stations.forEach((s) => {
    if ((s.isStart || s.isFinish) && s.physicalName) {
      startFinishPhysicalNames.add(s.physicalName)
    }
  })

  for (let i = 0; i < stations.length; i++) {
    stations[i].distanceFromPrev =
      i === 0 ? 0 : stations[i].distanceFromStart - stations[i - 1].distanceFromStart
    
    // Auto-flag start/finish with crew access and drop bag availability
    // (Runners can always get crew support and drop bags at start/finish, even on lap 2+)
    if (stations[i].physicalName && startFinishPhysicalNames.has(stations[i].physicalName!)) {
      stations[i].hasCrewAccess = true
      stations[i].hasDropBag = true
    }
  }

  return stations
}

/**
 * Extracts unique aid stations for race editing.
 * Used on the race setup page where the runner configures crew access, drop bags, etc. once per unique location.
 * Returns one entry per unique physicalName, sorted by first visit distance.
 */
export function extractUniqueAidStations(
  waypoints: Waypoint[],
  trackPoints: TrackPoint[]
): AidStation[] {
  const fullSequence = extractAidStations(waypoints, trackPoints)

  // Track first occurrence of each unique station
  const seenStations = new Map<string, AidStation>()
  const uniqueOrder: AidStation[] = []

  for (const station of fullSequence) {
    const key = station.physicalName ?? station.name
    if (!seenStations.has(key)) {
      seenStations.set(key, station)
      uniqueOrder.push(station)
    }
  }

  // Re-assign order numbers
  uniqueOrder.forEach((s, i) => {
    s.order = i
  })

  return uniqueOrder
}
