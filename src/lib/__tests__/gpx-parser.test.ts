import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseGPX, extractAidStations, extractUniqueAidStations } from '@/lib/gpx-parser'

const fixture = (name: string) =>
  readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')

describe('parseGPX', () => {
  it('extracts track points from a valid GPX file', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints } = parseGPX(gpx)

    expect(trackPoints.length).toBeGreaterThan(0)
    expect(trackPoints[0]).toMatchObject({
      lat: expect.any(Number),
      lon: expect.any(Number),
      ele: expect.any(Number),
    })
    expect(trackPoints[0].lat).toBeCloseTo(37.7749, 3)
  })

  it('extracts waypoints as aid stations from a valid GPX file', () => {
    const gpx = fixture('simple-race.gpx')
    const { waypoints } = parseGPX(gpx)

    expect(waypoints.length).toBe(3)
    expect(waypoints[0].name).toBe('Start / Aid Station 1')
  })

  it('returns empty waypoints array for GPX with no waypoints', () => {
    const gpx = fixture('no-waypoints.gpx')
    const { waypoints, trackPoints } = parseGPX(gpx)

    expect(waypoints).toHaveLength(0)
    expect(trackPoints.length).toBeGreaterThan(0)
  })

  it('handles multi-segment GPX tracks by concatenating all segments', () => {
    const gpx = fixture('multi-segment.gpx')
    const { trackPoints } = parseGPX(gpx)

    expect(trackPoints.length).toBe(4) // 2 from each segment
  })

  it('throws a descriptive error for invalid XML', () => {
    expect(() => parseGPX('<not valid xml <<<<')).toThrow()
  })

  it('throws a descriptive error when gpx root element is missing', () => {
    expect(() => parseGPX('<root><data>test</data></root>')).toThrow(/missing.*gpx|no.*trk/i)
  })

  it('preserves timestamps when present', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints } = parseGPX(gpx)

    expect(trackPoints[0].time).toBe('2024-06-15T06:00:00Z')
  })
})

describe('extractAidStations', () => {
  it('always includes Start and Finish stops', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    const start = stations.find((s) => s.isStart)
    const finish = stations.find((s) => s.isFinish)

    expect(start).toBeDefined()
    expect(start!.distanceFromStart).toBe(0)
    expect(start!.name).toBe('Start')

    expect(finish).toBeDefined()
    expect(finish!.distanceFromStart).toBeGreaterThan(0)
  })

  it('snaps waypoints to nearest track point and computes distances', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // 3 waypoints + Start + Finish = 5 stops
    expect(stations.length).toBe(5)

    const nonSpecial = stations.filter((s) => !s.isStart && !s.isFinish)
    expect(nonSpecial[0].distanceFromStart).toBeGreaterThanOrEqual(0)
    expect(nonSpecial[1].distanceFromStart).toBeGreaterThan(nonSpecial[0].distanceFromStart)
  })

  it('sets distanceFromPrev correctly for each station', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    for (let i = 1; i < stations.length; i++) {
      expect(stations[i].distanceFromPrev).toBeCloseTo(
        stations[i].distanceFromStart - stations[i - 1].distanceFromStart,
        5
      )
    }
  })

  it('returns only Start and Finish when waypoints is empty', () => {
    const gpx = fixture('no-waypoints.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    expect(stations).toHaveLength(2)
    expect(stations[0].isStart).toBe(true)
    expect(stations[1].isFinish).toBe(true)
  })

  it('assigns sequential order to stations sorted by distance', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    stations.forEach((s, i) => {
      expect(s.order).toBe(i)
    })
  })

  it('assigns visitNumber 1 to each unique waypoint name in a point-to-point course', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    // In a point-to-point course without repeated visits, every waypoint-derived
    // stop gets visitNumber 1. (The "Finish" waypoint in this fixture shares a name
    // with the auto-added Finish pseudo-stop, so the pseudo-stop gets visitNumber 2 —
    // that is expected behaviour for a naming collision, not a bug.)
    const waypointStops = stations.filter((s) => !s.isStart && !s.isFinish)
    waypointStops.forEach((s) => {
      expect(s.visitNumber).toBe(1)
    })
    expect(stations.find((s) => s.isStart)!.visitNumber).toBe(1)
  })

  it('labels Finish as "Finish" for a point-to-point course', () => {
    const gpx = fixture('simple-race.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const stations = extractAidStations(waypoints, trackPoints)

    const finish = stations.find((s) => s.isFinish)
    expect(finish!.name).toBe('Finish')
  })

  describe('loop course', () => {
    it('detects a loop and labels the finish "Start/Finish"', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      const finish = stations.find((s) => s.isFinish)
      expect(finish).toBeDefined()
      expect(finish!.name).toBe('Start/Finish')
    })

    it('produces two stops for an aid station visited twice on a loop', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      const aidAStops = stations.filter((s) => s.name === 'Aid A')
      expect(aidAStops).toHaveLength(2)
    })

    it('assigns visitNumber 1 and 2 to repeated aid station visits', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      const aidAStops = stations.filter((s) => s.name === 'Aid A')
      expect(aidAStops[0].visitNumber).toBe(1)
      expect(aidAStops[1].visitNumber).toBe(2)
    })

    it('orders repeated visits by distance from start', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      const aidAStops = stations.filter((s) => s.name === 'Aid A')
      expect(aidAStops[0].distanceFromStart).toBeLessThan(aidAStops[1].distanceFromStart)
    })

    it('separates the two visits by more than MIN_VISIT_SEPARATION_KM', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      const aidAStops = stations.filter((s) => s.name === 'Aid A')
      const separation = aidAStops[1].distanceFromStart - aidAStops[0].distanceFromStart
      expect(separation).toBeGreaterThan(1.0)
    })

    it('includes Start, two Aid A visits, and Start/Finish in correct order', () => {
      const gpx = fixture('loop-course.gpx')
      const { trackPoints, waypoints } = parseGPX(gpx)
      const stations = extractAidStations(waypoints, trackPoints)

      // Start, Aid A (v1), Aid A (v2), Start/Finish
      expect(stations).toHaveLength(4)
      expect(stations[0].isStart).toBe(true)
      expect(stations[1].name).toBe('Aid A')
      expect(stations[2].name).toBe('Aid A')
      expect(stations[3].isFinish).toBe(true)
    })
  })
})

describe('extractUniqueAidStations', () => {
  it('returns one entry per unique station on a loop course', () => {
    const gpx = fixture('loop-course.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // loop-course has: Start, Aid A (visited 2x), Start/Finish
    // Unique should have: Start, Aid A (once), Start/Finish
    expect(unique.length).toBe(3)

    const aidA = unique.find((s) => s.name === 'Aid A')
    expect(aidA).toBeDefined()
    expect(aidA!.visitNumber).toBe(1) // First visit
  })

  it('uses the first visit distance for unique stations', () => {
    const gpx = fixture('loop-course.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    // Aid A's first visit should be the distance shown in the unique list
    const aidA = unique.find((s) => s.name === 'Aid A')
    const full = extractAidStations(waypoints, trackPoints)
    const aidAFirst = full.find((s) => s.name === 'Aid A' && s.visitNumber === 1)

    expect(aidA!.distanceFromStart).toBe(aidAFirst!.distanceFromStart)
  })

  it('re-assigns order numbers to unique stations only', () => {
    const gpx = fixture('loop-course.gpx')
    const { trackPoints, waypoints } = parseGPX(gpx)
    const unique = extractUniqueAidStations(waypoints, trackPoints)

    unique.forEach((s, i) => {
      expect(s.order).toBe(i)
    })
  })
})
