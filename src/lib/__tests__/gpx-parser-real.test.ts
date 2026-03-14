import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseGPX, extractAidStations, extractUniqueAidStations } from '@/lib/gpx-parser'

describe('Real GPX: 2025 Hellbender Alternate 100K', () => {
  it('parses the Hellbender GPX and extracts correct course metrics', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')

    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // Course geometry - every visit shown separately
    expect(trackPoints.length).toBe(7026)
    expect(waypoints.length).toBe(9)
    // With deduplication of start/finish: 9 waypoints with multi-visit entries
    // = 3+3+3+3+2+2+2+2+2 = 22 visits total
    expect(stations.length).toBe(22)
    expect(stations[stations.length - 1].distanceFromStart).toBeCloseTo(160.96, 1)

    // Verify no two stations share the same location AND distance
    // (They can share location but at different distances due to multiple visits)
    const stationsByDistance = new Map<string, number[]>()
    stations.forEach((s) => {
      const key = `${s.lat},${s.lon}`
      const distances = stationsByDistance.get(key) || []
      distances.push(s.distanceFromStart)
      stationsByDistance.set(key, distances)
    })
    // Each location+distance combo should be unique
    let totalUnique = 0
    for (const distances of stationsByDistance.values()) {
      const uniqueDist = new Set(distances.map((d) => d.toFixed(1)))
      totalUnique += uniqueDist.size
    }
    expect(totalUnique).toBe(stations.length)
  })

  it('includes all expected unique aid stations', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // Extract unique station names (excluding multi-visit entries)
    const uniqueNames = new Set(
      stations
        .map((s) => s.name)
    )

    // Should have exactly 9 unique names (all from waypoints, no synthetic Start/Finish)
    expect(uniqueNames.size).toBe(9)

    const expectedStations = [
      'Start/Finish - Race HQ',
      'Long Gap Aid 3, 4, & 5',
      'Camp Grier Aid 8',
      'Kitsuma Aid 1 & 9',
      'Graphite Aid 2 & 6 & 10',
      'Bernard Water Stop - Self Serve',
      'Spring',
      'Toll Water Stop - Self Serve Pipe Spring',
      'Jerdon Mtn Aid 7 & 11',
    ]

    for (const name of expectedStations) {
      expect(uniqueNames.has(name)).toBe(true)
    }
  })

  it('correctly identifies loop course and generates multiple visits', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // This is a loop course (Start/Finish is same location, visited 3 times)
    const hqStops = stations.filter((s) => s.name === 'Start/Finish - Race HQ')
    expect(hqStops).toHaveLength(3)
    expect(hqStops[0].visitNumber).toBe(1)
    expect(hqStops[1].visitNumber).toBe(2)
    expect(hqStops[2].visitNumber).toBe(3)
  })

  it('tracks multiple visits with correct visit numbers', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // Long Gap visited 3 times
    const longGapStops = stations.filter((s) => s.name === 'Long Gap Aid 3, 4, & 5')
    expect(longGapStops).toHaveLength(3)
    expect(longGapStops[0].visitNumber).toBe(1)
    expect(longGapStops[0].distanceFromStart).toBeCloseTo(48.96, 1)
    expect(longGapStops[1].visitNumber).toBe(2)
    expect(longGapStops[1].distanceFromStart).toBeCloseTo(61.89, 1)
    expect(longGapStops[2].visitNumber).toBe(3)
    expect(longGapStops[2].distanceFromStart).toBeCloseTo(70.63, 1)

    // Graphite visited 3 times
    const graphiteStops = stations.filter((s) => s.name === 'Graphite Aid 2 & 6 & 10')
    expect(graphiteStops).toHaveLength(3)
    expect(graphiteStops[0].visitNumber).toBe(1)
    expect(graphiteStops[0].distanceFromStart).toBeCloseTo(30.54, 1)
    expect(graphiteStops[1].visitNumber).toBe(2)
    expect(graphiteStops[1].distanceFromStart).toBeCloseTo(88.77, 1)
    expect(graphiteStops[2].visitNumber).toBe(3)
    expect(graphiteStops[2].distanceFromStart).toBeCloseTo(140.02, 1)
  })

  it('orders stations by distance and maintains sequential order field', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // Verify order is sequential and matches distance sorting
    stations.forEach((s, i) => {
      expect(s.order).toBe(i)
    })

    // Verify distances are monotonically increasing
    for (let i = 1; i < stations.length; i++) {
      expect(stations[i].distanceFromStart).toBeGreaterThanOrEqual(
        stations[i - 1].distanceFromStart
      )
    }
  })

  it('calculates distanceFromPrev correctly for each station', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // First station should have distanceFromPrev = 0
    expect(stations[0].distanceFromPrev).toBe(0)

    // All others should match the difference in distances
    for (let i = 1; i < stations.length; i++) {
      const expectedDiff = stations[i].distanceFromStart - stations[i - 1].distanceFromStart
      expect(stations[i].distanceFromPrev).toBeCloseTo(expectedDiff, 5)
    }
  })

  it('produces correct station list for a full pace table', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // Simulate pace table with a constant pace of 10 min/km
    const paceMinPerKm = 10
    const paceTable = stations.map((s) => ({
      order: s.order,
      name: s.name,
      visitNumber: s.visitNumber,
      distanceFromStart: parseFloat(s.distanceFromStart.toFixed(2)),
      distanceFromPrev: parseFloat(s.distanceFromPrev.toFixed(2)),
      estimatedMinutes: Math.round(s.distanceFromStart * paceMinPerKm),
      estimatedArrival: formatTime(s.distanceFromStart * paceMinPerKm),
    }))

    // Verify the structure for the pace table is complete
    expect(paceTable[0]).toMatchObject({
      order: 0,
      name: 'Start/Finish - Race HQ', // The waypoint at the start
      visitNumber: 1,
      distanceFromPrev: 0,
      estimatedMinutes: 0,
    })
    expect(paceTable[0].distanceFromStart).toBeCloseTo(0, 0) // Very close to start

    // Verify some key stations
    const graphiteV2 = paceTable.find(
      (s) => s.name === 'Graphite Aid 2 & 6 & 10' && s.visitNumber === 2
    )
    expect(graphiteV2).toBeDefined()
    expect(graphiteV2!.distanceFromStart).toBeCloseTo(88.77, 1)
    expect(graphiteV2!.estimatedMinutes).toBeCloseTo(888, -1) // ~888 minutes

    // All stations present
    expect(paceTable.length).toBe(22)
  })

  it('maintains spatial coordinates for all stations', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // All stations should have valid lat/lon
    stations.forEach((s) => {
      expect(typeof s.lat).toBe('number')
      expect(typeof s.lon).toBe('number')
      expect(s.lat).toBeGreaterThanOrEqual(-90)
      expect(s.lat).toBeLessThanOrEqual(90)
      expect(s.lon).toBeGreaterThanOrEqual(-180)
      expect(s.lon).toBeLessThanOrEqual(180)
    })
  })
})

function formatTime(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return `${days}d ${hours}h ${minutes}m`
}

describe('extractUniqueAidStations: Real Hellbender', () => {
  it('returns one entry per unique aid station location', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // Hellbender has 9 waypoints; no synthetic markers added since waypoints exist at start/finish
    expect(unique.length).toBe(9)

    // Verify Start/Finish marker and other stations
    const startFinish = unique.find((s) => s.name === 'Start/Finish - Race HQ')
    const longGap = unique.find((s) => s.name === 'Long Gap Aid 3, 4, & 5')
    expect(startFinish).toBeDefined()
    expect(longGap).toBeDefined()
  })

  it('represents each unique aid station only once', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // Each name should appear only once
    const names = unique.map((s) => s.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('uses the first visit distance for multi-visit stations', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)

    const full = extractAidStations(waypoints, trackPoints)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // Long Gap appears 3 times in full; unique should show first visit
    const uniqueLongGap = unique.find((s) => s.name === 'Long Gap Aid 3, 4, & 5')
    const fullLongGapFirst = full.find(
      (s) => s.name === 'Long Gap Aid 3, 4, & 5' && s.visitNumber === 1
    )

    expect(uniqueLongGap).toBeDefined()
    expect(uniqueLongGap!.distanceFromStart).toBe(fullLongGapFirst!.distanceFromStart)
    expect(uniqueLongGap!.visitNumber).toBe(1)
  })

  it('provides clear data for race setup editing', () => {
    const gpxPath = resolve(__dirname, './fixtures/real-2025_Hellbender_Alternate.gpx')
    const gpx = readFileSync(gpxPath, 'utf-8')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // Simulate the setup form: crew and drop bag flags for each unique station
    const setupForm = unique.map((s) => ({
      order: s.order,
      name: s.name,
      hasCrewAccess: s.hasCrewAccess, // Runner edits this once
      hasDropBag: s.hasDropBag, // Runner edits this once
      firstVisitDistance: s.distanceFromStart,
    }))

    // 9 unique stations (no synthetic Start/Finish added since waypoints exist there)
    expect(setupForm.length).toBe(9)
    expect(setupForm[0].name).toBe('Start/Finish - Race HQ')
    expect(setupForm[setupForm.length - 1].name).toBe('Jerdon Mtn Aid 7 & 11')
  })
})
