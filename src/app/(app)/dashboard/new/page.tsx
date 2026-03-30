'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { parseGPX, extractAidStations } from '@/lib/gpx-parser'
import { guessTimezoneFromCoords } from '@/lib/timezone'
import { TimezoneSelect } from '@/components/ui/timezone-select'
import { isGuestMode, getGuestId, upsertGuestRace, saveGuestAidStations } from '@/lib/guest-storage'
import type { Race } from '@/lib/db/races'
import posthog from 'posthog-js'
import { getAttributionProperties } from '@/lib/marketing-attribution'

interface GPXPreview {
  trackPoints: number
  waypoints: number
  gpxString: string
}

export default function NewRacePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const userHasManuallySetTz = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('06:00')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [gpxPreview, setGpxPreview] = useState<GPXPreview | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Library tab state
  const [libraryRaces, setLibraryRaces] = useState<Race[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedLibraryRaceId, setSelectedLibraryRaceId] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (activeTab !== 'library' || libraryRaces.length > 0) return
    setLoadingLibrary(true)
    fetch('/api/library/races')
      .then((r) => r.json())
      .then((data) => setLibraryRaces(data.races ?? []))
      .catch(() => setLibraryRaces([]))
      .finally(() => setLoadingLibrary(false))
  }, [activeTab, libraryRaces.length])

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const { trackPoints, waypoints } = parseGPX(text)
      setGpxPreview({ trackPoints: trackPoints.length, waypoints: waypoints.length, gpxString: text })
      if (!userHasManuallySetTz.current && trackPoints.length > 0) {
        setTimezone(guessTimezoneFromCoords(trackPoints[0].lat, trackPoints[0].lon))
      }
      if (!name) setName(file.name.replace('.gpx', '').replace(/-|_/g, ' '))
    } catch {
      setError('Failed to parse GPX file. Please ensure it is a valid GPX file.')
    }
  }

  const handleLibrarySelect = (race: Race) => {
    setSelectedLibraryRaceId(race.raceId)
    setName(race.name)
    if (race.date) setDate(race.date)
    if (race.startTime) setStartTime(race.startTime)
    if (race.timezone) setTimezone(race.timezone)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !date || !startTime) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError(null)

    const guest = mounted && isGuestMode()

    try {
      if (guest) {
        const raceId = crypto.randomUUID()
        const now = new Date().toISOString()

        if (activeTab === 'library' && selectedLibraryRaceId) {
          const res = await fetch(`/api/library/races/${selectedLibraryRaceId}`)
          if (!res.ok) throw new Error('Failed to load library race')
          const data = await res.json()
          upsertGuestRace({
            ...data.race,
            raceId,
            userId: getGuestId(),
            name,
            date,
            startTime,
            timezone,
            isLibraryRace: false,
            createdAt: now,
          })
          saveGuestAidStations(raceId, data.aidStations ?? [])
          router.push(`/dashboard/${raceId}/setup`)
        } else {
          if (!gpxPreview) {
            setError('Please upload a GPX file.')
            setSubmitting(false)
            return
          }
          const { trackPoints, waypoints } = parseGPX(gpxPreview.gpxString)
          const stations = extractAidStations(waypoints, trackPoints)
          const startLat = trackPoints[0]?.lat
          const startLon = trackPoints[0]?.lon
          upsertGuestRace({
            raceId,
            userId: getGuestId(),
            name,
            date,
            startTime,
            timezone,
            gpxData: gpxPreview.gpxString,
            startLat,
            startLon,
            createdAt: now,
          })
          saveGuestAidStations(raceId, stations)
          router.push(`/dashboard/${raceId}/setup`)
        }
        return
      }

      let res: Response

      if (activeTab === 'library' && selectedLibraryRaceId) {
        res = await fetch('/api/races/from-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryRaceId: selectedLibraryRaceId, date, startTime, timezone }),
        })
      } else {
        res = await fetch('/api/races', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, date, startTime, timezone, gpx: gpxPreview?.gpxString }),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create race')
      }

      const { race } = await res.json()
      posthog.capture('race_created', {
        ...getAttributionProperties(),
        entryMethod: activeTab,
        raceId: race.raceId,
        isLibraryRace: activeTab === 'library',
      })
      router.push(`/dashboard/${race.raceId}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add a race</h1>
        <p className="text-muted-foreground">Upload a GPX file or choose from our race library</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="library" onValueChange={(v) => setActiveTab(v as 'upload' | 'library')}>
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">Race Library</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload GPX</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-3 pt-4">
            {loadingLibrary ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading races…</p>
            ) : libraryRaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No races in the library yet.
              </p>
            ) : (
              libraryRaces.map((race) => (
                <button
                  key={race.raceId}
                  type="button"
                  onClick={() => handleLibrarySelect(race)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent ${
                    selectedLibraryRaceId === race.raceId ? 'border-primary bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{race.name}</span>
                    {race.location && (
                      <span className="text-xs text-muted-foreground">{race.location}</span>
                    )}
                  </div>
                  {race.libraryDescription && (
                    <p className="text-sm text-muted-foreground mt-1">{race.libraryDescription}</p>
                  )}
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
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
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Race details</CardTitle>
            <CardDescription>Enter your race date and start time</CardDescription>
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
                  <TimezoneSelect
                    value={timezone}
                    onChange={(tz) => { userHasManuallySetTz.current = true; setTimezone(tz) }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create race'}
        </Button>
      </form>
    </div>
  )

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }
}
