'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { parseGPX } from '@/lib/gpx-parser'
import { TimezoneSelect } from '@/components/ui/timezone-select'
import type { Race } from '@/lib/db/races'

interface GPXPreview {
  trackPoints: number
  waypoints: number
  gpxString: string
}

interface AdminRaceFormProps {
  race?: Race
}

export function AdminRaceForm({ race }: AdminRaceFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !date || !startTime) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
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

      const url = isEdit ? `/api/admin/races/${race!.raceId}` : '/api/admin/races'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, body: form })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save race')
      }

      router.push('/admin/race-library')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
              ? 'Upload a new GPX file to replace the existing one, or leave blank to keep it.'
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
            <p className="text-xs text-muted-foreground">Existing GPX file will be kept.</p>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
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
  )
}
