import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { AidStation } from '@/types/gpx'

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@example.com' } }

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db/races', () => ({
  getRaceById: vi.fn(),
  decompressGPX: vi.fn((s: string) => s),
}))

// Aid stations are NOT fetched during insert — only currentStations from body is used
vi.mock('@/lib/db/aid-stations', () => ({
  getAidStations: vi.fn(),
  saveAidStations: vi.fn(),
}))

// Mock GPX parsing utilities so tests don't need real GPX files
vi.mock('@/lib/gpx-parser', () => ({
  parseGPX: vi.fn(),
}))

vi.mock('@/lib/geo-utils', () => ({
  cumulativeDistances: vi.fn(),
  interpolateAtDistance: vi.fn(() => ({ lat: 37.5, lon: -122.0 })),
  computeSegmentElevation: vi.fn(() => ({ grossClimbM: 100, grossDescentM: 50 })),
}))

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockRace = {
  raceId: 'race-1',
  userId: 'user-1',
  name: 'Test Race',
  date: '2024-06-15',
  startTime: '06:00',
  timezone: 'UTC',
  createdAt: '2024-01-01T00:00:00Z',
  gpxData: '<gpx/>',
}

const makeStation = (order: number, name: string, distanceFromStartKm: number): AidStation => ({
  order,
  name,
  physicalName: name,
  lat: 37 + order * 0.1,
  lon: -122,
  distanceFromStart: distanceFromStartKm,
  distanceFromPrev: distanceFromStartKm,
  grossClimbM: 0,
  grossDescentM: 0,
  elevationGain: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

// Two track points spanning 100km total
const mockTrackPoints = [
  { lat: 37, lon: -122, ele: 100 },
  { lat: 38, lon: -121, ele: 200 },
]
const mockCumDist = [0, 100] // 0 and 100km

/** Build a POST request for the insert endpoint */
function makeInsertRequest(
  distanceMi: number,
  name: string,
  currentStations: AidStation[]
): NextRequest {
  return new NextRequest('http://localhost/api/races/race-1/aid-stations/insert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ distanceMi, name, currentStations }),
  })
}

/** Initial two-station list every race starts with */
const startFinish = (): AidStation[] => [
  makeStation(0, 'Start', 0),
  makeStation(1, 'Finish', 100), // 100km = ~62.1mi
]

/** Wire up mocks for a standard insert that succeeds */
async function setupInsertMocks() {
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(mockSession as never)

  const { getRaceById } = await import('@/lib/db/races')
  vi.mocked(getRaceById).mockResolvedValue(mockRace as never)

  const { parseGPX } = await import('@/lib/gpx-parser')
  vi.mocked(parseGPX).mockReturnValue({ trackPoints: mockTrackPoints, waypoints: [] } as never)

  const { cumulativeDistances } = await import('@/lib/geo-utils')
  vi.mocked(cumulativeDistances).mockReturnValue(mockCumDist as never)
}

// ─── Auth & race validation ───────────────────────────────────────────────────

describe('POST /api/races/[raceId]/aid-stations/insert — auth & race validation', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, 'Aid 1', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, 'Aid 1', startFinish()),
      { params: Promise.resolve({ raceId: 'missing' }) }
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when race has no GPX data', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce({ ...mockRace, gpxData: undefined } as never)

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, 'Aid 1', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
  })
})

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/races/[raceId]/aid-stations/insert — input validation', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 400 when name is missing', async () => {
    await setupInsertMocks()
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, '', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/name/i)
  })

  it('returns 400 when distanceMi is zero', async () => {
    await setupInsertMocks()
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(0, 'Aid', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when distanceMi is negative', async () => {
    await setupInsertMocks()
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(-5, 'Aid', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when distanceMi exceeds total race distance', async () => {
    await setupInsertMocks()
    // 100km ÷ 1.60934 ≈ 62.1mi — request 70mi which is beyond
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(70, 'Aid', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/total race distance/i)
  })

  it('returns 400 when distanceMi is at or beyond the finish station distance', async () => {
    await setupInsertMocks()
    // Finish is at 80km ≈ 49.7mi; total race is 100km ≈ 62.1mi
    // Requesting 50mi (80.47km) is within total distance but past/at the Finish
    const stationsWithEarlyFinish = [
      makeStation(0, 'Start', 0),
      makeStation(1, 'Finish', 80), // finish at 80km, not 100km
    ]
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(50, 'Aid', stationsWithEarlyFinish),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/finish/i)
  })

  it('returns 400 when currentStations is missing', async () => {
    await setupInsertMocks()
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distanceMi: 10, name: 'Aid' }), // no currentStations
    })
    const res = await POST(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when currentStations is an empty array', async () => {
    await setupInsertMocks()
    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, 'Aid', []),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )
    expect(res.status).toBe(400)
  })
})

// ─── Core insert behaviour ────────────────────────────────────────────────────

describe('POST /api/races/[raceId]/aid-stations/insert — insert behaviour', () => {
  beforeEach(() => vi.resetAllMocks())

  it('inserts a single station and returns 3 stations with sequential orders', async () => {
    await setupInsertMocks()

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const res = await POST(
      makeInsertRequest(10, 'Midpoint', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.aidStations).toHaveLength(3)
    // Orders must be renumbered 0, 1, 2
    expect(data.aidStations.map((s: AidStation) => s.order)).toEqual([0, 1, 2])
    // Start and Finish remain
    expect(data.aidStations[0].name).toBe('Start')
    expect(data.aidStations[2].name).toBe('Finish')
    // New station in the middle
    expect(data.aidStations[1].name).toBe('Midpoint')
  })

  it('new station distanceFromPrev equals distKm minus previous station distance', async () => {
    await setupInsertMocks()

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    // Insert at 10mi = 16.0934km; Start is at 0 → distanceFromPrev should be ~16.09
    const res = await POST(
      makeInsertRequest(10, 'Aid 1', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )

    const data = await res.json()
    const inserted = data.aidStations.find((s: AidStation) => s.name === 'Aid 1')
    const expectedKm = 10 * 1.60934
    expect(inserted.distanceFromPrev).toBeCloseTo(expectedKm, 1)
  })

  it('does not call getAidStations — uses currentStations from request body only', async () => {
    // REGRESSION: the old bug called getAidStations (DB fetch) which returned stale
    // data, dropping any stations added since the last DB save
    await setupInsertMocks()

    const { getAidStations } = await import('@/lib/db/aid-stations')

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    await POST(
      makeInsertRequest(10, 'Aid 1', startFinish()),
      { params: Promise.resolve({ raceId: 'race-1' }) }
    )

    expect(vi.mocked(getAidStations)).not.toHaveBeenCalled()
  })
})

// ─── REGRESSION: multiple inserts before save ─────────────────────────────────

describe('POST /api/races/[raceId]/aid-stations/insert — multi-insert regression', () => {
  beforeEach(() => vi.resetAllMocks())

  it('preserves all previously inserted stations across sequential inserts', async () => {
    // This is the exact scenario that caused the data-loss bug:
    //   1. User adds Station A → client state = [Start, A, Finish]
    //   2. User adds Station B (passing [Start, A, Finish] as currentStations)
    //      → should return [Start, A, B, Finish]
    //   3. User saves → all 4 stations should be in the DB
    //
    // OLD BUG: Step 2 would DB-fetch [Start, Finish] (ignoring unsaved A),
    // so the response was [Start, B, Finish] — Station A silently dropped.
    await setupInsertMocks()
    // Reset call count but keep all resolved values
    const { parseGPX } = await import('@/lib/gpx-parser')
    const { cumulativeDistances } = await import('@/lib/geo-utils')
    vi.mocked(parseGPX).mockReturnValue({ trackPoints: mockTrackPoints, waypoints: [] } as never)
    vi.mocked(cumulativeDistances).mockReturnValue(mockCumDist as never)

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const params = { params: Promise.resolve({ raceId: 'race-1' }) }

    // Insert 1: [Start, Finish] → [Start, Aid A, Finish]
    const res1 = await POST(makeInsertRequest(10, 'Aid A', startFinish()), params)
    expect(res1.status).toBe(200)
    const { aidStations: afterFirst } = await res1.json()
    expect(afterFirst).toHaveLength(3)
    expect(afterFirst.map((s: AidStation) => s.name)).toContain('Aid A')

    // Re-setup mocks for second call (vi.resetAllMocks between tests, but within test we need them)
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(mockSession as never)
    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValue(mockRace as never)
    vi.mocked(parseGPX).mockReturnValue({ trackPoints: mockTrackPoints, waypoints: [] } as never)
    vi.mocked(cumulativeDistances).mockReturnValue(mockCumDist as never)

    // Insert 2: send [Start, Aid A, Finish] as currentStations → [Start, Aid A, Aid B, Finish]
    const res2 = await POST(makeInsertRequest(20, 'Aid B', afterFirst), params)
    expect(res2.status).toBe(200)
    const { aidStations: afterSecond } = await res2.json()

    // All four stations must be present
    expect(afterSecond).toHaveLength(4)
    const names = afterSecond.map((s: AidStation) => s.name)
    expect(names).toContain('Start')
    expect(names).toContain('Aid A')
    expect(names).toContain('Aid B')
    expect(names).toContain('Finish')

    // Orders renumbered 0..3
    expect(afterSecond.map((s: AidStation) => s.order)).toEqual([0, 1, 2, 3])

    // Start first, Finish last
    expect(afterSecond[0].name).toBe('Start')
    expect(afterSecond[3].name).toBe('Finish')
  })

  it('handles three sequential inserts without data loss', async () => {
    await setupInsertMocks()

    const { POST } = await import('@/app/api/races/[raceId]/aid-stations/insert/route')
    const { auth } = await import('@/lib/auth')
    const { getRaceById } = await import('@/lib/db/races')
    const { parseGPX } = await import('@/lib/gpx-parser')
    const { cumulativeDistances } = await import('@/lib/geo-utils')
    const params = { params: Promise.resolve({ raceId: 'race-1' }) }

    const resetMocks = () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never)
      vi.mocked(getRaceById).mockResolvedValue(mockRace as never)
      vi.mocked(parseGPX).mockReturnValue({ trackPoints: mockTrackPoints, waypoints: [] } as never)
      vi.mocked(cumulativeDistances).mockReturnValue(mockCumDist as never)
    }

    resetMocks()
    const res1 = await POST(makeInsertRequest(10, 'Aid A', startFinish()), params)
    const { aidStations: s1 } = await res1.json()
    expect(s1).toHaveLength(3)

    resetMocks()
    const res2 = await POST(makeInsertRequest(20, 'Aid B', s1), params)
    const { aidStations: s2 } = await res2.json()
    expect(s2).toHaveLength(4)

    resetMocks()
    const res3 = await POST(makeInsertRequest(30, 'Aid C', s2), params)
    const { aidStations: s3 } = await res3.json()
    expect(s3).toHaveLength(5)

    const names = s3.map((s: AidStation) => s.name)
    expect(names).toEqual(['Start', 'Aid A', 'Aid B', 'Aid C', 'Finish'])
    expect(s3.map((s: AidStation) => s.order)).toEqual([0, 1, 2, 3, 4])
  })
})
