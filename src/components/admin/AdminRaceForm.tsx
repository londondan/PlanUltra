'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseGPX } from '@/lib/gpx-parser'
import { TimezoneSelect } from '@/components/ui/timezone-select'
import { LocationPanel } from '@/components/CrewTab'
import type { Race } from '@/lib/db/races'
import type { AidStation } from '@/types/gpx'
import { ChevronDown } from 'lucide-react'

interface GPXPreview {
  trackPoints: number
  waypoints: number
  gpxString: string
}

interface AdminRaceFormProps {
  race?: Race
  initialAidStations?: AidStation[]
  showCreatedBanner?: boolean
}

const PARKING_ICONS: Record<string, string> = {
  'parking-lot': '🅿️',
  'side-of-road': '🚗',
  'trailhead': '🥾',
  'drop-off': '🚌',
}

export function AdminRaceForm({ race, initialAidStations, showCreatedBanner }: AdminRaceFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = !!race

  const [name, setName] = useState(race?.name ?? '')
  const [date, setDate] = useState(race?.date ?? '')
  const [startTime, setStartTime] = useState(race?.startTime ?? '06:00')
  const [timezone, setTimezone] = useState(race?.timezone ?? 'America/Los_Angeles')
  const [location, setLocation] = useState(race?.location ?? '')
  const [libraryDescription, setLibraryDescription] = useState(race?.libraryDescription ?? '')
  const [gpxPreview, setGpxPreview] = useState<GPXPreview | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Aid stations panel
  const [aidStations] = useState<AidStation[]>(initialAidStations ?? [])
  const [stationUpdates, setStationUpdates] = useState<Record<number, Partial<AidStation>>>({})
  const [aidPanelOpen, setAidPanelOpen] = useState(showCreatedBanner ?? false)
  const [expandedStation, setExpandedStation] = useState<number | null>(null)

  // GPX replace confirm dialog
  const [showGpxConfirm, setShowGpxConfirm] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const { trackPoints, waypoints } = parseGPX(text)
      setGpxPreview({ trackPoints: trackPoints.length, waypoints: waypoints.length, gpxString: text })
    } catch {
      setError('Failed to parse GPX file. Please ensure it is a valid GPX file.')
    }
  }

  const doSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const hasStationUpdates = Object.keys(stationUpdates).length > 0
      const hasNewGpx = !!gpxPreview

      const url = isEdit ? `/api/admin/races/${race!.raceId}` : '/api/admin/races'
      const method = isEdit ? 'PUT' : 'POST'

      let res: Response

      if (isEdit && (hasStationUpdates || hasNewGpx)) {
        // Use JSON body for edit with stationUpdates or GPX replacement
        const body: Record<string, unknown> = {
          name, date, startTime, timezone, location, libraryDescription,
        }
        if (hasStationUpdates) {
          body.stationUpdates = Object.entries(stationUpdates).map(([order, updates]) => ({
            order: Number(order),
            ...updates,
          }))
        }
        if (hasNewGpx) {
          body.gpxString = gpxPreview!.gpxString
        }
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        // FormData for new races or simple edits without stationUpdates
        const form = new FormData()
        form.append('name', name)
        form.append('date', date)
        form.append('startTime', startTime)
        form.append('timezone', timezone)
        if (location) form.append('location', location)
        if (libraryDescription) form.append('libraryDescription', libraryDescription)
        if (gpxPreview) {
          const blob = new Blob([gpxPreview.gpxString], { type: 'application/gpx+xml' })
          form.append('gpx', blob, 'race.gpx')
        }
        res = await fetch(url, { method, body: form })
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to save race')
      }

      if (!isEdit) {
        router.push(`/admin/race-library/${data.race.raceId}/edit?created=true`)
      } else {
        router.push('/admin/race-library')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
      setPendingSubmit(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !date || !startTime) {
      setError('Please fill in all required fields.')
      return
    }

    // If editing and a new GPX was selected, show confirmation first
    if (isEdit && gpxPreview) {
      setShowGpxConfirm(true)
      setPendingSubmit(true)
      return
    }

    await doSubmit()
  }

  const handleGpxConfirmReplace = async () => {
    setShowGpxConfirm(false)
    await doSubmit()
  }

  const handleGpxConfirmCancel = () => {
    setShowGpxConfirm(false)
    setPendingSubmit(false)
    setGpxPreview(null)
  }

  const sortedStations = [...aidStations].sort((a, b) => a.distanceFromStart - b.distanceFromStart)

  const getMergedStation = (station: AidStation): AidStation => ({
    ...station,
    ...stationUpdates[station.order],
  })

  const noopSave = async () => {}

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isEdit ? `Edit — ${race!.name}` : 'Add race to library'}
        </h1>

        {/* GPX upload */}
        <Card>
          <CardHeader>
            <CardTitle>GPX file</CardTitle>
            <CardDescription>
              {isEdit
                ? 'Replace the GPX file, or leave blank to keep the existing one.'
                : 'Upload the race GPX file.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) await handleFile(f)
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <p className="text-sm font-medium">Drop your GPX file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .gpx files</p>
            </div>
            {gpxPreview && (
              <div className="flex gap-2">
                <Badge variant="secondary">{gpxPreview.trackPoints} track points</Badge>
                <Badge variant="secondary">{gpxPreview.waypoints} waypoints found</Badge>
              </div>
            )}
            {isEdit && !gpxPreview && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Existing GPX file will be kept.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Replace GPX file ↑
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Race details */}
        <Card>
          <CardHeader>
            <CardTitle>Race details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Race name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Western States 100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location ?? ''}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Squaw Valley, CA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Race date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time</Label>
                <div className="flex gap-2">
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                  <TimezoneSelect value={timezone} onChange={setTimezone} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="libraryDescription">
                Library description{' '}
                <span className="text-muted-foreground font-normal">(optional, max 160 chars)</span>
              </Label>
              <textarea
                id="libraryDescription"
                value={libraryDescription ?? ''}
                onChange={(e) => setLibraryDescription(e.target.value.slice(0, 160))}
                placeholder="Short description shown in the race picker..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground text-right">
                {(libraryDescription ?? '').length}/160
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Created banner */}
        {showCreatedBanner && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Race created. Now set aid station locations below.
          </div>
        )}

        {/* Aid Stations panel — only shown when stations exist */}
        {sortedStations.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left"
                onClick={() => setAidPanelOpen(v => !v)}
              >
                <CardTitle>Aid Stations</CardTitle>
                <ChevronDown
                  className="size-4 text-muted-foreground transition-transform"
                  style={{ transform: aidPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              <CardDescription className="mt-1">
                Set crew parking locations for each crew-accessible aid station.
              </CardDescription>
            </CardHeader>

            {aidPanelOpen && (
              <CardContent className="pt-4 space-y-2">
                {sortedStations.map((station) => {
                  const merged = getMergedStation(station)
                  const isExpanded = expandedStation === station.order
                  const hasCoords = !!(merged.crewParkingCoords)

                  const toggleCrewAccess = () =>
                    setStationUpdates((prev) => ({
                      ...prev,
                      [station.order]: { ...prev[station.order], hasCrewAccess: !merged.hasCrewAccess },
                    }))

                  if (!merged.hasCrewAccess) {
                    return (
                      <div
                        key={station.order}
                        className="rounded-lg border px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs font-mono">
                            MI {(station.distanceFromStart / 1.60934).toFixed(1)}
                          </Badge>
                          <span className="text-sm font-medium">{station.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground italic">No crew access</span>
                          <Button type="button" variant="ghost" size="sm" onClick={toggleCrewAccess}>
                            + Enable crew access
                          </Button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={station.order} className="rounded-lg border overflow-hidden">
                      {/* Station row */}
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="secondary" className="text-xs font-mono shrink-0">
                            MI {(station.distanceFromStart / 1.60934).toFixed(1)}
                          </Badge>
                          <span className="text-sm font-medium truncate">{station.name}</span>
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300 shrink-0">
                            Crew ✓
                          </Badge>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove crew access"
                            onClick={toggleCrewAccess}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasCoords ? (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {merged.crewParkingType
                                  ? `${PARKING_ICONS[merged.crewParkingType] ?? ''} ${merged.crewParkingCoords!.lat.toFixed(4)}, ${merged.crewParkingCoords!.lng.toFixed(4)}`
                                  : `${merged.crewParkingCoords!.lat.toFixed(4)}, ${merged.crewParkingCoords!.lng.toFixed(4)}`
                                }
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedStation(isExpanded ? null : station.order)}
                              >
                                {isExpanded ? 'Done' : 'Edit'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">No location set</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedStation(isExpanded ? null : station.order)}
                              >
                                {isExpanded ? 'Done' : '+ Set location'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Inline LocationPanel */}
                      {isExpanded && (
                        <div className="border-t">
                          <LocationPanel
                            station={merged}
                            raceId="admin"
                            onSave={noopSave}
                            onChange={(updates) =>
                              setStationUpdates((prev) => ({
                                ...prev,
                                [station.order]: { ...prev[station.order], ...updates },
                              }))
                            }
                          />
                          <div className="px-4 py-3 flex justify-end border-t bg-muted/20">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setExpandedStation(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            )}
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || pendingSubmit}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save to library'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/race-library')}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* GPX replacement confirmation dialog */}
      <Dialog open={showGpxConfirm} onOpenChange={(open) => { if (!open) handleGpxConfirmCancel() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace GPX file?</DialogTitle>
            <DialogDescription>
              Uploading a new GPX will replace all aid stations for this race in the library.
              Location data (parking coords and notes) will be preserved where station names match.
              All other section data will be reset.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            User races already copied from this template are not affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleGpxConfirmCancel}>
              Cancel
            </Button>
            <Button onClick={handleGpxConfirmReplace} disabled={submitting}>
              {submitting ? 'Saving…' : 'Replace and save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
