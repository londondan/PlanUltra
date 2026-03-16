'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { parseGPX } from '@/lib/gpx-parser'
import { CURATED_RACES } from '@/data/curated-races'

interface GPXPreview {
  trackPoints: number
  waypoints: number
  gpxString: string
}

export default function NewRacePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('06:00')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [gpxPreview, setGpxPreview] = useState<GPXPreview | null>(null)
  const [selectedRace, setSelectedRace] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const { trackPoints, waypoints } = parseGPX(text)
      setGpxPreview({ trackPoints: trackPoints.length, waypoints: waypoints.length, gpxString: text })
      if (!name) setName(file.name.replace('.gpx', '').replace(/-|_/g, ' '))
    } catch {
      setError('Failed to parse GPX file. Please ensure it is a valid GPX file.')
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }

  const handleCuratedSelect = async (raceId: string) => {
    const race = CURATED_RACES.find((r) => r.id === raceId)
    if (!race) return
    setSelectedRace(raceId)
    setName(race.name)

    const res = await fetch(race.gpxPath)
    const text = await res.text()
    const { trackPoints, waypoints } = parseGPX(text)
    setGpxPreview({ trackPoints: trackPoints.length, waypoints: waypoints.length, gpxString: text })
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
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, startTime, timezone, gpx: gpxPreview?.gpxString }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create race')
      }

      const { race } = await res.json()
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
        <h1 className="text-4xl font-bold text-foreground font-display" style={{ letterSpacing: '-0.02em' }}>Add a race</h1>
        <p className="text-muted-foreground">Upload a GPX file or choose from our race library</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">Upload GPX</TabsTrigger>
            <TabsTrigger value="library" className="flex-1">Race Library</TabsTrigger>
          </TabsList>

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

          <TabsContent value="library" className="space-y-3 pt-4">
            {CURATED_RACES.map((race) => (
              <button
                key={race.id}
                type="button"
                onClick={() => handleCuratedSelect(race.id)}
                className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent ${
                  selectedRace === race.id ? 'border-primary bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{race.name}</span>
                  <Badge>{race.distance}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{race.location}</p>
              </button>
            ))}
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
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/Los_Angeles"
              />
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
}
