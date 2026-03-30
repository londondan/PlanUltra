import { describe, it, expect, vi } from 'vitest'
import {
  extractCoordsFromGoogleMapsUrl,
  parseCoordinateString,
  resolveGoogleMapsInput,
} from '@/lib/maps'

describe('parseCoordinateString', () => {
  it('parses raw lat,lng strings', () => {
    expect(parseCoordinateString('41.7442,-111.8413')).toEqual({
      lat: 41.7442,
      lng: -111.8413,
    })
  })

  it('rejects invalid coordinate strings', () => {
    expect(parseCoordinateString('hello world')).toBeNull()
    expect(parseCoordinateString('91,-111.8')).toBeNull()
  })
})

describe('extractCoordsFromGoogleMapsUrl', () => {
  it('parses Google Maps q param URLs', () => {
    expect(
      extractCoordsFromGoogleMapsUrl('https://maps.google.com/?q=41.7442,-111.8413')
    ).toEqual({
      lat: 41.7442,
      lng: -111.8413,
    })
  })

  it('parses fuller Google Maps place URLs with @lat,lng in the path', () => {
    expect(
      extractCoordsFromGoogleMapsUrl(
        'https://www.google.com/maps/place/Test/@41.7442,-111.8413,15z/data=!3m1!4b1'
      )
    ).toEqual({
      lat: 41.7442,
      lng: -111.8413,
    })
  })

  it('parses fuller Google Maps URLs with !3d/!4d coordinates', () => {
    expect(
      extractCoordsFromGoogleMapsUrl(
        'https://www.google.com/maps/place/Test/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.7442!4d-111.8413'
      )
    ).toEqual({
      lat: 41.7442,
      lng: -111.8413,
    })
  })

  it('rejects unsupported hosts', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://example.com/?q=41.7442,-111.8413')).toBeNull()
  })
})

describe('resolveGoogleMapsInput', () => {
  it('resolves raw coords without fetch', async () => {
    const fetchMock = vi.fn()
    await expect(resolveGoogleMapsInput('41.7442,-111.8413', fetchMock as typeof fetch)).resolves.toEqual({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves full Google Maps URLs without fetch', async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveGoogleMapsInput('https://maps.google.com/?q=41.7442,-111.8413', fetchMock as typeof fetch)
    ).resolves.toEqual({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported non-Google URLs', async () => {
    await expect(resolveGoogleMapsInput('https://example.com/place/41.7442,-111.8413')).resolves.toEqual({
      ok: false,
      reason: 'invalid_format',
    })
  })

  it('resolves short links using the final redirected URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      url: 'https://www.google.com/maps/place/Test/@41.7442,-111.8413,15z',
    })

    await expect(
      resolveGoogleMapsInput('https://maps.app.goo.gl/abc123', fetchMock as typeof fetch)
    ).resolves.toEqual({
      ok: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    })
  })

  it('fails when a resolved short link has no coordinates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      url: 'https://www.google.com/maps/place/Test',
    })

    await expect(
      resolveGoogleMapsInput('https://maps.app.goo.gl/abc123', fetchMock as typeof fetch)
    ).resolves.toEqual({
      ok: false,
      reason: 'coords_not_found',
    })
  })
})
