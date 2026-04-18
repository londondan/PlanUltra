import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { AidStation } from '@/types/gpx'

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@example.com' } }

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db/races', () => ({ getRaceById: vi.fn() }))

vi.mock('@/lib/db/aid-stations', () => ({
  getAidStations: vi.fn(),
  saveAidStations: vi.fn(),
  updateAidStation: vi.fn(),
}))

const makeStation = (order: number, name: string, distanceFromStart: number): AidStation => ({
  order,
  name,
  physicalName: name,
  lat: 37 + order * 0.1,
  lon: -122,
  distanceFromStart,
  distanceFromPrev: distanceFromStart,
  grossClimbM: 0,
  grossDescentM: 0,
  elevationGain: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

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

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/races/[raceId]/aid-stations', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { GET } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/missing/aid-stations')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns aidStations and hasGPX: true when race has gpxData', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(mockRace as never)

    const stations = [makeStation(0, 'Start', 0), makeStation(1, 'Finish', 50)]
    const { getAidStations } = await import('@/lib/db/aid-stations')
    vi.mocked(getAidStations).mockResolvedValueOnce(stations)

    const { GET } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'race-1' }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hasGPX).toBe(true)
    expect(data.aidStations).toHaveLength(2)
  })

  it('returns hasGPX: false when race has no gpxData', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce({ ...mockRace, gpxData: undefined } as never)

    const { getAidStations } = await import('@/lib/db/aid-stations')
    vi.mocked(getAidStations).mockResolvedValueOnce([])

    const { GET } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'race-1' }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hasGPX).toBe(false)
  })
})

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe('PUT /api/races/[raceId]/aid-stations', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aidStations: [] }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(null)

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/missing/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aidStations: [] }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('saves ALL stations in the array without truncation', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(mockRace as never)

    const { saveAidStations } = await import('@/lib/db/aid-stations')
    vi.mocked(saveAidStations).mockResolvedValueOnce(undefined)

    const fiveStations = [
      makeStation(0, 'Start', 0),
      makeStation(1, 'Aid 1', 20),
      makeStation(2, 'Aid 2', 40),
      makeStation(3, 'Aid 3', 60),
      makeStation(4, 'Finish', 80),
    ]

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aidStations: fiveStations }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'race-1' }) })

    expect(res.status).toBe(200)
    expect(vi.mocked(saveAidStations)).toHaveBeenCalledOnce()
    const saved = vi.mocked(saveAidStations).mock.calls[0][1]
    expect(saved).toHaveLength(5)
    expect(saved.map((s) => s.name)).toEqual(['Start', 'Aid 1', 'Aid 2', 'Aid 3', 'Finish'])
  })

  it('regression: saving after multiple inserts preserves all stations', async () => {
    // This directly tests the save step of the multi-insert → save flow
    // If saveAidStations receives fewer stations than sent, data is being dropped here
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(mockRace as never)

    const { saveAidStations } = await import('@/lib/db/aid-stations')
    vi.mocked(saveAidStations).mockResolvedValueOnce(undefined)

    // Simulate what the client sends after 3 sequential inserts
    const stationsAfterThreeInserts = [
      makeStation(0, 'Start', 0),
      makeStation(1, 'Checkpoint A', 16.09),  // 10mi
      makeStation(2, 'Checkpoint B', 32.19),  // 20mi
      makeStation(3, 'Checkpoint C', 48.28),  // 30mi
      makeStation(4, 'Finish', 80.47),
    ]

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aidStations: stationsAfterThreeInserts }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'race-1' }) })

    expect(res.status).toBe(200)
    const saved = vi.mocked(saveAidStations).mock.calls[0][1]
    // All 5 stations must be saved — none dropped
    expect(saved).toHaveLength(5)
    expect(saved.map((s) => s.order)).toEqual([0, 1, 2, 3, 4])
  })

  it('returns 400 for invalid body', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(mockRace as never)

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unexpected: true }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(400)
  })

  it('syncs flag updates to all stations sharing the same physicalName', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(mockRace as never)

    // Two visits to the same physical location
    const twin1 = { ...makeStation(1, 'Skyline Aid', 20), physicalName: 'Skyline' }
    const twin2 = { ...makeStation(3, 'Skyline Aid', 60), physicalName: 'Skyline' }

    const { getAidStations, updateAidStation } = await import('@/lib/db/aid-stations')
    vi.mocked(getAidStations).mockResolvedValueOnce([
      makeStation(0, 'Start', 0),
      twin1,
      makeStation(2, 'Other Aid', 40),
      twin2,
      makeStation(4, 'Finish', 80),
    ])
    vi.mocked(updateAidStation).mockResolvedValue(undefined)

    const { PUT } = await import('@/app/api/races/[raceId]/aid-stations/route')
    const req = new NextRequest('http://localhost/api/races/race-1/aid-stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: 1, updates: { hasDropBag: true } }),
    })
    const res = await PUT(req, { params: Promise.resolve({ raceId: 'race-1' }) })

    expect(res.status).toBe(200)
    // Both sibling stations should be updated
    expect(vi.mocked(updateAidStation)).toHaveBeenCalledTimes(2)
    const updatedOrders = vi.mocked(updateAidStation).mock.calls.map((c) => c[1])
    expect(updatedOrders).toContain(1)
    expect(updatedOrders).toContain(3)
  })
})
