import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } }

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/races', () => ({
  createRace: vi.fn(),
  getRacesByUser: vi.fn(),
  getRaceById: vi.fn(),
  updateRace: vi.fn(),
  deleteRace: vi.fn(),
}))

vi.mock('@/lib/db/aid-stations', () => ({
  saveAidStations: vi.fn(),
  getAidStations: vi.fn(),
  updateAidStation: vi.fn(),
  deleteAidStations: vi.fn(),
}))

vi.mock('@/lib/gpx-parser', () => ({
  parseGPX: vi.fn(() => ({ trackPoints: [], waypoints: [] })),
  extractAidStations: vi.fn(() => []),
}))

describe('GET /api/races', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { GET } = await import('@/app/api/races/route')
    const req = new NextRequest('http://localhost/api/races')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns races for authenticated user', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRacesByUser } = await import('@/lib/db/races')
    vi.mocked(getRacesByUser).mockResolvedValueOnce([
      {
        raceId: 'race-1',
        userId: 'user-123',
        name: 'Test Race',
        date: '2024-06-15',
        startTime: '06:00',
        timezone: 'America/Los_Angeles',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ])

    const { GET } = await import('@/app/api/races/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.races).toHaveLength(1)
    expect(data.races[0].name).toBe('Test Race')
  })
})

describe('POST /api/races', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { POST } = await import('@/app/api/races/route')
    const req = new NextRequest('http://localhost/api/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', date: '2024-06-15', startTime: '06:00' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a race and returns 201', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { createRace } = await import('@/lib/db/races')
    const mockRace = {
      raceId: 'new-race-id',
      userId: 'user-123',
      name: 'My Race',
      date: '2024-06-15',
      startTime: '06:00',
      timezone: 'UTC',
      createdAt: '2024-01-01T00:00:00Z',
    }
    vi.mocked(createRace).mockResolvedValueOnce(mockRace)

    const { POST } = await import('@/app/api/races/route')
    const req = new NextRequest('http://localhost/api/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Race', date: '2024-06-15', startTime: '06:00' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.race.raceId).toBe('new-race-id')
  })

  it('returns 400 when required fields are missing', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { POST } = await import('@/app/api/races/route')
    const req = new NextRequest('http://localhost/api/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing date and startTime' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/races/[raceId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { GET } = await import('@/app/api/races/[raceId]/route')
    const req = new NextRequest('http://localhost/api/races/race-1')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/races/[raceId]/route')
    const req = new NextRequest('http://localhost/api/races/unknown')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns race with aid stations', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce({
      raceId: 'race-1',
      userId: 'user-123',
      name: 'My Race',
      date: '2024-06-15',
      startTime: '06:00',
      timezone: 'UTC',
      createdAt: '2024-01-01T00:00:00Z',
    })

    const { getAidStations } = await import('@/lib/db/aid-stations')
    vi.mocked(getAidStations).mockResolvedValueOnce([])

    const { GET } = await import('@/app/api/races/[raceId]/route')
    const req = new NextRequest('http://localhost/api/races/race-1')
    const res = await GET(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.race.raceId).toBe('race-1')
    expect(Array.isArray(data.aidStations)).toBe(true)
  })
})

describe('DELETE /api/races/[raceId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { DELETE } = await import('@/app/api/races/[raceId]/route')
    const req = new NextRequest('http://localhost/api/races/race-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(401)
  })

  it('deletes race and returns success', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { getRaceById } = await import('@/lib/db/races')
    vi.mocked(getRaceById).mockResolvedValueOnce({
      raceId: 'race-1',
      userId: 'user-123',
      name: 'My Race',
      date: '2024-06-15',
      startTime: '06:00',
      timezone: 'UTC',
      createdAt: '2024-01-01T00:00:00Z',
    })

    const { deleteAidStations } = await import('@/lib/db/aid-stations')
    const { deleteRace } = await import('@/lib/db/races')
    vi.mocked(deleteAidStations).mockResolvedValueOnce(undefined)
    vi.mocked(deleteRace).mockResolvedValueOnce(undefined)

    const { DELETE } = await import('@/app/api/races/[raceId]/route')
    const req = new NextRequest('http://localhost/api/races/race-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ raceId: 'race-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
