'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AidStation } from '@/types/gpx'
import { getVisitMiles, formatMileBadge } from '@/lib/laps'

const KM_PER_MI = 1.60934

const PARKING_OPTIONS: { value: string; label: string }[] = [
  { value: 'parking-lot',  label: '🅿 Parking lot' },
  { value: 'side-of-road', label: '🛣 Side of road' },
  { value: 'trailhead',    label: '🥾 Trailhead' },
  { value: 'drop-off',     label: '🚗 Drop-off only' },
  { value: 'shuttle',      label: '🚌 Shuttle only' },
  { value: 'walk-in',      label: '🚶 Walk-in / hike-in' },
]

interface StationFields {
  url: string
  urlError: string | null
  resolvedCoords: { lat: number; lng: number } | null
  resolving: boolean
  parkingType: string
  notes: string
}

function getResolveErrorMessage(reason?: string): string {
  if (reason === 'coords_not_found') {
    return "Couldn't extract coordinates from that link. Try a fuller Maps URL or enter lat,lng directly."
  }
  if (reason === 'unresolvable_short_link') {
    return "Couldn't resolve that short link right now. Try again or enter lat,lng directly."
  }
  return 'Invalid format. Use a Google Maps link or lat,lng.'
}

export default function CrewDetailsPage({
  params,
}: {
  params: Promise<{ token: string; editKey: string }>
}) {
  const { token, editKey } = use(params)
  const router = useRouter()

  const [lapCount, setLapCount] = useState(1)
  const [lapDistanceKm, setLapDistanceKm] = useState(0)
  const [crewStations, setCrewStations] = useState<AidStation[]>([])
  const [fields, setFields] = useState<Record<string, StationFields>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/plans/${token}/aid-stations`)
      .then((r) => r.json())
      .then((data) => {
        const stations: AidStation[] = data.aidStations ?? []
        const race = data.race
        const lc = race?.lapCount ?? 1
        const finish = stations.find((s) => s.isFinish)
        const lapKm = finish?.distanceFromStart ?? 0

        setLapCount(lc)
        setLapDistanceKm(lapKm)

        // Unique crew stations in course order
        const seen = new Map<string, AidStation>()
        for (const s of stations) {
          const key = s.physicalName ?? s.name
          if (!seen.has(key) && s.hasCrewAccess) seen.set(key, s)
        }
        const crew = Array.from(seen.values()).sort(
          (a, b) => a.distanceFromStart - b.distanceFromStart
        )
        setCrewStations(crew)

        // Initialise field state from existing station data
        const init: Record<string, StationFields> = {}
        for (const s of crew) {
          const key = s.physicalName ?? s.name
          init[key] = {
            url: s.crewParkingUrl ?? '',
            urlError: null,
            resolvedCoords: s.crewParkingCoords ?? null,
            resolving: false,
            parkingType: s.crewParkingType ?? '',
            notes: s.crewLocationNotes ?? '',
          }
        }
        setFields(init)
      })
      .catch(() => setError('Failed to load crew stations'))
      .finally(() => setLoading(false))
  }, [token])

  // Missing-details count: crew stations with no Maps link and no coords
  const missingCount = useMemo(() => {
    return crewStations.filter((s) => {
      const key = s.physicalName ?? s.name
      const f = fields[key]
      return !f?.resolvedCoords && !f?.url
    }).length
  }, [crewStations, fields])

  const updateField = (key: string, patch: Partial<StationFields>) => {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const handleUrlBlur = async (key: string) => {
    const url = fields[key]?.url?.trim()
    if (!url) {
      updateField(key, { urlError: null, resolvedCoords: null })
      return
    }

    updateField(key, { resolving: true, urlError: null })

    try {
      const res = await fetch(`/api/plans/${token}/maps/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
        body: JSON.stringify({ input: url }),
      })
      const data = await res.json()
      if (data.success) {
        updateField(key, { resolvedCoords: data.coords, urlError: null, resolving: false })
      } else {
        updateField(key, {
          resolvedCoords: null,
          urlError: getResolveErrorMessage(data.reason),
          resolving: false,
        })
      }
    } catch {
      updateField(key, { resolvedCoords: null, urlError: 'Connection error. Try again.', resolving: false })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Build updated stations array with crew details fanned out to all visits
      const res = await fetch(`/api/plans/${token}/aid-stations`)
      if (!res.ok) throw new Error('Failed to load stations')
      const { aidStations: allStations }: { aidStations: AidStation[] } = await res.json()

      const updated = allStations.map((s) => {
        const key = s.physicalName ?? s.name
        const f = fields[key]
        if (!f || !s.hasCrewAccess) return s
        return {
          ...s,
          crewParkingUrl: f.url.trim() || undefined,
          crewParkingCoords: f.resolvedCoords ?? undefined,
          crewParkingType: (f.parkingType || undefined) as AidStation['crewParkingType'],
          crewLocationNotes: f.notes.trim() || undefined,
        }
      })

      const saveRes = await fetch(`/api/plans/${token}/aid-stations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
        body: JSON.stringify({ aidStations: updated }),
      })
      if (!saveRes.ok) throw new Error('Failed to save')
      router.push(`/crew/${token}`)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto py-10 px-4 text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Progress header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>1 Basics</span>
        <span>●</span>
        <span>2 Aid stations</span>
        <span>●</span>
        <span className="font-semibold text-foreground">3 Crew details</span>
        <span>○</span>
        <span>Plan</span>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Crew details</h1>
        {missingCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {missingCount} station{missingCount !== 1 ? 's' : ''} missing details
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Add a Google Maps link and parking info for each crew stop. All fields are optional.
      </p>

      {crewStations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No crew-accessible stations yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go back to step 2 and enable crew access on at least one station.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {crewStations.map((station) => {
            const key = station.physicalName ?? station.name
            const f = fields[key]
            if (!f) return null
            const visitMiles = getVisitMiles(station, lapCount, lapDistanceKm)
            const milesLabel = formatMileBadge(visitMiles)
            const resolvedLabel =
              f.resolvedCoords
                ? `${f.resolvedCoords.lat.toFixed(4)}, ${f.resolvedCoords.lng.toFixed(4)}`
                : null
            const mapsHref = f.resolvedCoords
              ? `https://maps.google.com/?q=${f.resolvedCoords.lat},${f.resolvedCoords.lng}`
              : null

            return (
              <div key={key} className="rounded-lg border overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 bg-muted/30 border-b flex items-baseline gap-3">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{milesLabel}</span>
                  <span className="font-semibold text-sm">{station.name}</span>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* Maps link */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Google Maps link</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={f.url}
                        onChange={(e) => updateField(key, { url: e.target.value, urlError: null })}
                        onBlur={() => handleUrlBlur(key)}
                        placeholder="https://maps.app.goo.gl/… or lat,lng"
                        className="text-sm h-8 flex-1"
                      />
                      {f.resolving && (
                        <span className="text-xs text-muted-foreground shrink-0">resolving…</span>
                      )}
                      {!f.resolving && f.resolvedCoords && (
                        <span className="text-xs text-green-700 shrink-0">✓</span>
                      )}
                    </div>
                    {f.urlError && (
                      <p className="text-xs text-destructive">{f.urlError}</p>
                    )}
                    {resolvedLabel && mapsHref && (
                      <p className="text-xs text-muted-foreground">
                        Resolved: {resolvedLabel}{' '}
                        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="underline">
                          open ↗
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Parking type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Parking type</Label>
                    <select
                      value={f.parkingType}
                      onChange={(e) => updateField(key, { parkingType: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— select —</option>
                      {PARKING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Instructions</Label>
                    <textarea
                      value={f.notes}
                      onChange={(e) => updateField(key, { notes: e.target.value })}
                      maxLength={500}
                      rows={2}
                      placeholder="e.g. Park in the main lot by the lodge. Crew tent is behind the timing arch."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {f.notes.length}/500
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={() => router.push(`/crew/${token}/edit/${editKey}/stations`)}
          disabled={saving}
        >
          ← Aid stations
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & view plan →'}
        </Button>
      </div>
    </div>
  )
}
