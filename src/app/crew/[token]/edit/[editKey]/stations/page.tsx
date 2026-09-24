'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { AidStation } from '@/types/gpx'
import type { Race } from '@/lib/db/races'
import { haversineDistance } from '@/lib/geo-utils'
import { getVisitMiles, formatMileBadge } from '@/lib/laps'

const LOOP_THRESHOLD_KM = 0.5

export default function StationsPage({
  params,
}: {
  params: Promise<{ token: string; editKey: string }>
}) {
  const { token, editKey } = use(params)
  const router = useRouter()

  const [race, setRace] = useState<Race | null>(null)
  const [stations, setStations] = useState<AidStation[]>([])
  const [lapCount, setLapCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGPX, setHasGPX] = useState(true)

  // Add station form
  const [addingStation, setAddingStation] = useState(false)
  const [addName, setAddName] = useState('')
  const [addMile, setAddMile] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/plans/${token}/aid-stations`)
      .then((r) => r.json())
      .then((data) => {
        setStations(data.aidStations ?? [])
        setHasGPX(data.hasGPX ?? false)
        if (data.race) {
          setRace(data.race)
          setLapCount(data.race.lapCount ?? 1)
        }
      })
      .catch(() => setError('Failed to load stations'))
      .finally(() => setLoading(false))
  }, [token])

  // Lap distance in km (the distance of one lap = finish distanceFromStart)
  const lapDistanceKm = useMemo(() => {
    const finish = stations.find((s) => s.isFinish)
    return finish?.distanceFromStart ?? 0
  }, [stations])

  // Loop detection from station data
  const gpxIsLoop = useMemo(() => {
    const start = stations.find((s) => s.isStart)
    const finish = stations.find((s) => s.isFinish)
    if (!start || !finish) return false
    return haversineDistance(
      { lat: start.lat, lon: start.lon },
      { lat: finish.lat, lon: finish.lon }
    ) < LOOP_THRESHOLD_KM
  }, [stations])

  // Double-count guard: GPX already contains multiple loops if any station has visitNumber > 1
  const gpxAlreadyHasMultipleLoops = useMemo(
    () => stations.some((s) => (s.visitNumber ?? 1) > 1),
    [stations]
  )

  // One row per unique physical location
  const uniqueGroups = useMemo(() => {
    const seen = new Map<string, { station: AidStation; distances: number[] }>()
    for (const s of stations) {
      const key = s.physicalName ?? s.name
      if (seen.has(key)) {
        seen.get(key)!.distances.push(s.distanceFromStart)
      } else {
        seen.set(key, { station: s, distances: [s.distanceFromStart] })
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => Math.min(...a.distances) - Math.min(...b.distances)
    )
  }, [stations])

  const updateByPhysicalName = (physicalName: string, updates: Partial<AidStation>) => {
    setStations((prev) =>
      prev.map((s) => {
        if ((s.physicalName ?? s.name) !== physicalName) return s
        const updated = { ...s, ...updates }
        if (updates.name !== undefined) updated.physicalName = updates.name
        return updated
      })
    )
  }

  const deleteByPhysicalName = (physicalName: string) => {
    setStations((prev) =>
      prev
        .filter((s) => (s.physicalName ?? s.name) !== physicalName)
        .map((s, i) => ({ ...s, order: i }))
    )
  }

  const handleAddStation = async () => {
    if (!addName.trim()) { setAddError('Station name is required'); return }
    const mile = parseFloat(addMile)
    if (isNaN(mile) || mile <= 0) { setAddError('Enter a valid mile marker'); return }
    setAddError(null)
    setAddLoading(true)
    try {
      const res = await fetch(`/api/plans/${token}/aid-stations/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
        body: JSON.stringify({ distanceMi: mile, name: addName.trim(), currentStations: stations }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Failed to add station'); return }
      setStations(data.aidStations)
      setAddingStation(false)
      setAddName('')
      setAddMile('')
    } catch {
      setAddError('Failed to add station. Please try again.')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const [stationsRes, lapRes] = await Promise.all([
        fetch(`/api/plans/${token}/aid-stations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
          body: JSON.stringify({ aidStations: stations }),
        }),
        fetch(`/api/plans/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
          body: JSON.stringify({ lapCount }),
        }),
      ])
      if (!stationsRes.ok || !lapRes.ok) throw new Error('Failed to save')
      router.push(`/crew/${token}/edit/${editKey}/crew`)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto py-10 px-4 text-muted-foreground">Loading…</div>

  const showDoubleCountWarning = lapCount > 1 && gpxAlreadyHasMultipleLoops
  const showNonLoopWarning = lapCount > 1 && !gpxIsLoop

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Progress header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/new`} className="hover:text-foreground transition-colors">1 Basics</Link>
        <span>●</span>
        <span className="font-semibold text-foreground">2 Aid stations</span>
        <span>○</span>
        <span>3 Crew details</span>
        <span>○</span>
        <span>Plan</span>
      </div>

      {/* Edit-link callout */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm space-y-1">
        <p className="font-medium text-amber-900">Save your edit link</p>
        <p className="text-amber-800 font-mono text-xs break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/crew/{token}/edit/{editKey}/stations
        </p>
        <p className="text-amber-700 text-xs">Anyone with this link can edit the plan. Bookmark it — it won&apos;t be shown again.</p>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{race?.name ?? 'Aid stations'}</h1>
      </div>

      {/* Loops control */}
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
        <Label htmlFor="lapCount" className="text-sm font-medium shrink-0">Number of loops</Label>
        <select
          id="lapCount"
          value={lapCount}
          onChange={(e) => setLapCount(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {lapCount > 1 && lapDistanceKm > 0 && (
          <span className="text-sm text-muted-foreground">
            Each loop: {(lapDistanceKm * 0.621371).toFixed(1)} mi
            · Total: {(lapDistanceKm * lapCount * 0.621371).toFixed(1)} mi
          </span>
        )}
      </div>

      {showDoubleCountWarning && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          This GPX looks like it already contains multiple loops. Set loops to 1 unless it represents a single lap.
        </div>
      )}

      {showNonLoopWarning && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          This course doesn&apos;t return to the start. Are you sure it&apos;s a loop?
        </div>
      )}

      {/* Station list */}
      {uniqueGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No aid stations found.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Your GPX has no waypoints — add stations by mile marker below.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {uniqueGroups.map(({ station }) => {
            const key = station.physicalName ?? station.name
            const isSpecial = !!(station.isStart || station.isFinish)
            const visitMiles = getVisitMiles(station, lapCount, lapDistanceKm)
            const milesLabel = formatMileBadge(visitMiles)

            return (
              <div key={key} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                  {milesLabel}
                </Badge>

                {isSpecial ? (
                  <span className="text-sm font-medium flex-1">{station.name}</span>
                ) : (
                  <Input
                    value={station.name}
                    onChange={(e) => updateByPhysicalName(key, { name: e.target.value })}
                    className="h-7 text-sm flex-1"
                  />
                )}

                <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none shrink-0">
                  {isSpecial ? (
                    <span className="text-xs font-medium text-green-700">Crew ✓</span>
                  ) : (
                    <>
                      <input
                        type="checkbox"
                        checked={station.hasCrewAccess}
                        onChange={(e) => updateByPhysicalName(key, { hasCrewAccess: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span>Crew</span>
                    </>
                  )}
                </label>

                {!isSpecial && (
                  <button
                    type="button"
                    onClick={() => deleteByPhysicalName(key)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-sm"
                    title="Remove station"
                  >
                    🗑
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add station */}
      {hasGPX && (
        <div>
          {!addingStation ? (
            <button
              type="button"
              onClick={() => setAddingStation(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add station
            </button>
          ) : (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Add a station</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="add-name" className="text-xs">Station name</Label>
                  <Input
                    id="add-name"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Meadow Creek"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-mile" className="text-xs">
                    Mile marker {lapCount > 1 ? '(within one loop)' : ''}
                  </Label>
                  <Input
                    id="add-mile"
                    type="number"
                    step="0.1"
                    min="0"
                    value={addMile}
                    onChange={(e) => setAddMile(e.target.value)}
                    placeholder="e.g. 23.3"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {addError && <p className="text-xs text-destructive">{addError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAddingStation(false); setAddName(''); setAddMile(''); setAddError(null) }}
                  disabled={addLoading}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddStation} disabled={addLoading}>
                  {addLoading ? 'Adding…' : 'Add →'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={() => router.push('/new')} disabled={saving}>
          ← Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Continue → Crew details'}
        </Button>
      </div>
    </div>
  )
}
