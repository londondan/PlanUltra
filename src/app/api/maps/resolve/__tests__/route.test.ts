import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } }

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/maps', async () => {
  const actual = await vi.importActual<typeof import('@/lib/maps')>('@/lib/maps')
  return {
    ...actual,
    resolveGoogleMapsInput: vi.fn(),
  }
})

describe('POST /api/maps/resolve', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '41.7442,-111.8413' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns success for raw coordinates', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { resolveGoogleMapsInput } = await import('@/lib/maps')
    vi.mocked(resolveGoogleMapsInput).mockResolvedValueOnce({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '41.7442,-111.8413' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
  })

  it('returns success for a directly parseable Google Maps URL', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { resolveGoogleMapsInput } = await import('@/lib/maps')
    vi.mocked(resolveGoogleMapsInput).mockResolvedValueOnce({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'https://maps.google.com/?q=41.7442,-111.8413' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
  })

  it('returns success for short links that resolve to coordinates', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { resolveGoogleMapsInput } = await import('@/lib/maps')
    vi.mocked(resolveGoogleMapsInput).mockResolvedValueOnce({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'https://maps.app.goo.gl/abc123' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
  })

  it('returns a user-safe error when no coordinates can be extracted', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { resolveGoogleMapsInput } = await import('@/lib/maps')
    vi.mocked(resolveGoogleMapsInput).mockResolvedValueOnce({
      ok: false,
      reason: 'coords_not_found',
    })

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'https://maps.app.goo.gl/no-coords' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: false,
      reason: 'coords_not_found',
      error: "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly.",
    })
  })

  it('returns an invalid-format error for unsupported hosts', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const { resolveGoogleMapsInput } = await import('@/lib/maps')
    vi.mocked(resolveGoogleMapsInput).mockResolvedValueOnce({
      ok: false,
      reason: 'invalid_format',
    })

    const { POST } = await import('@/app/api/maps/resolve/route')
    const req = new NextRequest('http://localhost/api/maps/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'https://example.com/place' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: false,
      reason: 'invalid_format',
      error: 'Invalid format. Use a Google Maps link or enter lat,lng directly.',
    })
  })
})
