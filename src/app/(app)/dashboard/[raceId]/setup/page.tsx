'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { isGuestMode, getGuestAidStations, saveGuestAidStations } from '@/lib/guest-storage'
import type { AidStation } from '@/types/gpx'

const KM_TO_MI = 0.621371

const PARKING_TYPE_LABELS: Record<string, string> = {
  'parking-lot': 'Parking lot',
  'side-of-road': 'Side of road',
  'trailhead': 'Trailhead',
  'drop-off': 'Drop-off only',
}

function validateCoords(latStr: string, lngStr: string): string | null {
  const bothEmpty = !latStr.trim() && !lngStr.trim()
  if (bothEmpty) return null
  const oneEmpty = !latStr.trim() || !lngStr.trim()
  if (oneEmpty) return 'Enter both lat and lng, or leave both blank'
  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (isNaN(lat) || isNaN(lng)) return 'Must be a number'
  if (lat < -90 || lat > 90) return 'Lat must be between -90 and 90'
  if (lng < -180 || lng > 180) return 'Lng must be between -180 and 180'
  return null
}

export default function SetupPage({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSetupMode = searchParams.get('setup') === 'true'

  const [stations, setStations] = useState<AidStation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Parking panel open state per physicalName key
  const [parkingExpanded, setParkingExpanded] = useState<Record<string, boolean>>({})
  // Lat/lng as strings for input binding and validation
  const [coordInputs, setCoordInputs] = useState<Record<string, { lat: string; lng: string }>>({})
  // Validation errors per physicalName key
  const [coordErrors, setCoordErrors] = useState<Record<string, string | null>>({})

  const [hasGPX, setHasGPX] = useState(true)

  // Add station form state
  const [addingStation, setAddingStation] = useState(false)
  const [addName, setAddName] = useState('')
  const [addMile, setAddMile] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const load = async () => {
      try {
        let loaded: AidStation[]
        if (isGuestMode()) {
          loaded = getGuestAidStations(raceId)
        } else {
          const res = await fetch(`/api/races/${raceId}/aid-stations`)
          if (!res.ok) {
            throw new Error('Race not found')
          }
          const data = await res.json()
          loaded = data.aidStations ?? []
          setHasGPX(data.hasGPX ?? false)
        }
        setStations(loaded)

        // Initialise coord inputs and panel expansion from existing data
        const initialCoords: Record<string, { lat: string; lng: string }> = {}
        const initialExpanded: Record<string, boolean> = {}
        const seen = new Set<string>()
        for (const s of loaded) {
          const key = s.physicalName ?? s.name
          if (seen.has(key)) continue
          seen.add(key)
          // Start/Finish always expand parking panel
          if (s.isStart || s.isFinish) {
            initialExpanded[key] = true
          }
          if (s.crewParkingCoords) {
            initialCoords[key] = {
              lat: String(s.crewParkingCoords.lat),
              lng: String(s.crewParkingCoords.lng),
            }
            // Expand panel if existing parking data
            if (s.hasCrewAccess) initialExpanded[key] = true
          }
        }
        setCoordInputs(initialCoords)
        setParkingExpanded(initialExpanded)
      } catch {
        setError('Failed to load aid stations')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [raceId, mounted])

  // One entry per unique physical location, sorted by first (lowest) distance
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

  const formatMiles = (distances: number[]) => {
    const sorted = [...distances].sort((a, b) => a - b)
    return sorted.map((d) => `MI ${(d * KM_TO_MI).toFixed(1)}`).join(' · ')
  }

  const handleAddStation = async () => {
    if (!addName.trim()) { setAddError('Station name is required'); return }
    const mile = parseFloat(addMile)
    if (isNaN(mile) || mile <= 0) { setAddError('Enter a valid mile marker'); return }
    setAddError(null)
    setAddLoading(true)
    try {
      const res = await fetch(`/api/races/${raceId}/aid-stations/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceMi: mile, name: addName.trim(), currentStations: stations }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Failed to add station'); return }
      const newStations: AidStation[] = data.aidStations
      setStations(newStations)
      // Merge new station into coordInputs/parkingExpanded without resetting existing values
      const newKey = addName.trim()
      setCoordInputs((prev) => ({ ...prev, [newKey]: { lat: '', lng: '' } }))
      setParkingExpanded((prev) => ({ ...prev }))
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
    // Validate all crew-accessible stations' coordinates
    const newErrors: Record<string, string | null> = {}
    let hasError = false
    for (const { station } of uniqueGroups) {
      if (!station.hasCrewAccess) continue
      const key = station.physicalName ?? station.name
      const { lat = '', lng = '' } = coordInputs[key] ?? {}
      const err = validateCoords(lat, lng)
      newErrors[key] = err
      if (err) hasError = true
    }
    setCoordErrors(newErrors)
    if (hasError) return

    setSaving(true)
    setError(null)
    try {
      // Build save payload: fan out settings to all visits, null parking when no crew access
      const stationsToSave = stations.map((s) => {
        if (!s.hasCrewAccess) {
          return { ...s, crewParkingCoords: undefined, crewParkingType: undefined, crewLocationNotes: undefined }
        }
        const key = s.physicalName ?? s.name
        const { lat = '', lng = '' } = coordInputs[key] ?? {}
        const coords =
          lat.trim() && lng.trim()
            ? { lat: Number(lat), lng: Number(lng) }
            : undefined
        return { ...s, crewParkingCoords: coords }
      })

      if (mounted && isGuestMode()) {
        saveGuestAidStations(raceId, stationsToSave)
      } else {
        const res = await fetch(`/api/races/${raceId}/aid-stations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aidStations: stationsToSave }),
        })
        if (!res.ok) throw new Error('Failed to save')
      }
      router.push(`/dashboard/${raceId}`)
    } catch {
      setError('Failed to save aid stations. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => router.push(`/dashboard/${raceId}`)

  if (loading) return <div className="text-muted-foreground">Loading aid stations…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress indicator — setup mode only */}
      {isSetupMode && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600 font-medium">✓ Create race</span>
          <span className="text-muted-foreground">────</span>
          <span className="font-semibold">Set up aid stations</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isSetupMode ? 'Set up aid stations' : 'Aid stations'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Set drop bag and crew access for each aid station. Crew-accessible stations can include
          parking and location info for your crew.
        </p>
      </div>

      {uniqueGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No aid stations found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueGroups.map(({ station, distances }) => {
            const key = station.physicalName ?? station.name
            const isSpecial = !!(station.isStart || station.isFinish)
            const expanded = parkingExpanded[key] ?? false
            const hasCrewAccess = station.hasCrewAccess
            const coordError = coordErrors[key] ?? null

            return (
              <div key={key} className="rounded-lg border overflow-hidden">
                {/* Station header */}
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <Badge variant="secondary" className="text-xs font-mono shrink-0">
                        {formatMiles(distances)}
                      </Badge>
                      {isSpecial ? (
                        <span className="font-semibold text-sm">{station.name}</span>
                      ) : (
                        <Input
                          value={station.name}
                          onChange={(e) => updateByPhysicalName(key, { name: e.target.value })}
                          className="h-7 text-sm max-w-xs"
                        />
                      )}
                    </div>
                    {isSpecial && (
                      <span className="text-xs text-muted-foreground shrink-0">🔒 locked</span>
                    )}
                  </div>

                  {/* Flags */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      {isSpecial ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          Drop bag ✓
                        </span>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            checked={station.hasDropBag}
                            onChange={(e) =>
                              updateByPhysicalName(key, { hasDropBag: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                          <span>Drop bag</span>
                        </>
                      )}
                    </label>

                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      {isSpecial ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          Crew ✓
                        </span>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            checked={station.hasCrewAccess}
                            onChange={(e) =>
                              updateByPhysicalName(key, { hasCrewAccess: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                          <span>Crew access</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Parking panel toggle — shown when crew access is on */}
                  {hasCrewAccess && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() =>
                        setParkingExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                    >
                      <span className="text-xs">{expanded ? '▼' : '▶'}</span>
                      Parking &amp; location
                    </button>
                  )}
                </div>

                {/* Parking panel — inline, only when crew access on and expanded */}
                {hasCrewAccess && expanded && (
                  <div className="border-t bg-muted/30 px-4 py-4 space-y-4">
                    {/* Coordinates */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Coordinates (optional)</Label>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={`lat-${key}`} className="text-xs text-muted-foreground">
                            Lat
                          </Label>
                          <Input
                            id={`lat-${key}`}
                            type="number"
                            step="any"
                            placeholder="38.3646"
                            value={coordInputs[key]?.lat ?? ''}
                            onChange={(e) =>
                              setCoordInputs((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], lat: e.target.value },
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={`lng-${key}`} className="text-xs text-muted-foreground">
                            Lng
                          </Label>
                          <Input
                            id={`lng-${key}`}
                            type="number"
                            step="any"
                            placeholder="-79.1629"
                            value={coordInputs[key]?.lng ?? ''}
                            onChange={(e) =>
                              setCoordInputs((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], lng: e.target.value },
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      {coordError && (
                        <p className="text-xs text-destructive">{coordError}</p>
                      )}
                    </div>

                    {/* Parking type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Parking type (optional)</Label>
                      <select
                        value={station.crewParkingType ?? ''}
                        onChange={(e) =>
                          updateByPhysicalName(key, {
                            crewParkingType:
                              (e.target.value as AidStation['crewParkingType']) || undefined,
                          })
                        }
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— select —</option>
                        {Object.entries(PARKING_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Location notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Location notes (optional)</Label>
                      <textarea
                        value={station.crewLocationNotes ?? ''}
                        onChange={(e) =>
                          updateByPhysicalName(key, { crewLocationNotes: e.target.value })
                        }
                        maxLength={500}
                        rows={2}
                        placeholder="e.g. Main lot at the campground, walk 200m to aid station."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {(station.crewLocationNotes ?? '').length}/500
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add a station */}
      {mounted && !isGuestMode() && !hasGPX && !loading && stations.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This race has no route file — aid stations can&apos;t be added manually.
        </p>
      )}
      {mounted && !isGuestMode() && hasGPX && (
        <div>
          {!addingStation ? (
            <button
              type="button"
              onClick={() => setAddingStation(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>+</span> Add a station
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
                  <Label htmlFor="add-mile" className="text-xs">Mile marker</Label>
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
                  {addLoading ? 'Adding…' : 'Add station →'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={handleSkip} disabled={saving}>
          {isSetupMode ? 'Skip for now' : 'Cancel'}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isSetupMode ? 'Save & continue →' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
