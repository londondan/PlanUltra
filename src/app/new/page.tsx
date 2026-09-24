'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { parseGPX } from '@/lib/gpx-parser'
import { guessTimezoneFromCoords } from '@/lib/timezone'
import { TimezoneSelect } from '@/components/ui/timezone-select'

interface GPXPreview {
  trackPoints: number
  waypoints: number
  gpxString: string
}

function savePlanToLocalStorage(shareToken: string, editKey: string, name: string, date: string) {
  try {
    const key = 'planultra_plans'
    const existing: unknown[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    type PlanEntry = { shareToken: string; editKey: string; name: string; date: string }
    const filtered = (existing as PlanEntry[]).filter(
      (p) => p.shareToken !== shareToken
    )
    filtered.unshift({ shareToken, editKey, name, date })
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)))
  } catch {
    // localStorage unavailable — non-fatal
  }
}

export default function NewPlanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const userHasManuallySetTz = useRef(false)

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
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
      if (!userHasManuallySetTz.current && trackPoints.length > 0) {
        setTimezone(guessTimezoneFromCoords(trackPoints[0].lat, trackPoints[0].lon))
      }
      if (!name) setName(file.name.replace(/\.gpx$/i, '').replace(/[-_]/g, ' '))
    } catch {
      setError('Failed to parse GPX file. Please ensure it is a valid .gpx file.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !date) {
      setError('Please fill in race name and date.')
      return
    }
    if (!gpxPreview) {
      setError('Please upload a GPX file.')
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
      form.append('gpx', new File([gpxPreview.gpxString], 'race.gpx', { type: 'application/gpx+xml' }))

      const res = await fetch('/api/plans', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create plan')
      }

      const { shareToken, editKey } = await res.json()
      savePlanToLocalStorage(shareToken, editKey, name, date)
      router.push(`/crew/${shareToken}/edit/${editKey}/stations`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a crew plan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a GPX file to get started. No account needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GPX drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) await handleFile(file)
          }}
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
          {gpxPreview ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-700">GPX loaded</p>
              <div className="flex gap-2 justify-center">
                <Badge variant="secondary">{gpxPreview.trackPoints.toLocaleString()} track points</Badge>
                <Badge variant="secondary">{gpxPreview.waypoints} waypoints</Badge>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Drop your GPX file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .gpx files up to 10 MB</p>
            </>
          )}
        </div>

        {/* Race details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Race name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cruel Jewel 100"
              required
            />
          </div>

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
            <Label htmlFor="startTime">Start time <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1"
              />
              <TimezoneSelect
                value={timezone}
                onChange={(tz) => { userHasManuallySetTz.current = true; setTimezone(tz) }}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating plan…' : 'Continue to aid stations →'}
        </Button>
      </form>
    </div>
  )
}
