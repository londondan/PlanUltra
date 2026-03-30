import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationPanel } from '@/components/CrewTab'
import type { AidStation } from '@/types/gpx'

function makeStation(): AidStation {
  return {
    order: 3,
    name: 'Leatham Hollow',
    lat: 41.7442,
    lon: -111.8413,
    distanceFromStart: 10,
    distanceFromPrev: 10,
    elevationGain: 0,
    grossClimbM: 0,
    grossDescentM: 0,
    hasDropBag: false,
    hasCrewAccess: true,
  }
}

function getSetButton(): HTMLButtonElement {
  return screen.getAllByRole('button').find((button) => button.textContent?.includes('Set')) as HTMLButtonElement
}

describe('LocationPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves a pasted link and saves the returned coordinates', async () => {
    const user = userEvent.setup()
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchMock = vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<LocationPanel station={makeStation()} raceId="race-1" onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /location & parking/i }))
    const input = screen.getByPlaceholderText(/paste a google maps link/i)
    await user.type(input, 'https://maps.app.goo.gl/abc123')
    await user.click(getSetButton())

    expect(fetchMock).toHaveBeenCalledWith('/api/maps/resolve', expect.objectContaining({
      method: 'POST',
    }))
    expect(screen.getByRole('button', { name: 'Resolving...' })).toBeDisabled()

    resolveFetch!(new Response(JSON.stringify({
      success: true,
      coords: { lat: 41.7442, lng: -111.8413 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(3, {
        crewParkingCoords: { lat: 41.7442, lng: -111.8413 },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Location set')).toBeInTheDocument()
    })
  })

  it('shows the API error and preserves the pasted value on failure', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({
        success: false,
        reason: 'coords_not_found',
        error: "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly.",
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<LocationPanel station={makeStation()} raceId="race-1" onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /location & parking/i }))
    const input = screen.getByPlaceholderText(/paste a google maps link/i) as HTMLInputElement
    await user.type(input, 'https://maps.app.goo.gl/no-coords')
    await user.click(getSetButton())

    await waitFor(() => {
      expect(screen.getByText(/we couldn't extract coordinates/i)).toBeInTheDocument()
    })
    expect(input.value).toBe('https://maps.app.goo.gl/no-coords')
    expect(onSave).not.toHaveBeenCalled()
  })
})
