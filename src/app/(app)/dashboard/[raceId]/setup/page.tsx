'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AidStation } from '@/types/gpx'

interface EditableAidStation extends AidStation {
  _editing?: boolean
}

const KM_TO_MI = 0.621371

export default function SetupPage({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = use(params)
  const router = useRouter()
  const [stations, setStations] = useState<EditableAidStation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unit, setUnit] = useState<'mi' | 'km'>('mi')

  useEffect(() => {
    fetch(`/api/races/${raceId}/aid-stations`)
      .then((r) => r.json())
      .then((data) => setStations(data.aidStations ?? []))
      .catch(() => setError('Failed to load aid stations'))
      .finally(() => setLoading(false))
  }, [raceId])

  // Group all stops by physicalName (or name for legacy records) so each physical
  // location is shown once in the setup table.
  const uniqueGroups = useMemo(() => {
    const seen = new Map<
      string,
      { station: EditableAidStation; distances: number[] }
    >()
    for (const s of stations) {
      const key = s.physicalName ?? s.name
      if (seen.has(key)) {
        seen.get(key)!.distances.push(s.distanceFromStart)
      } else {
        seen.set(key, { station: s, distances: [s.distanceFromStart] })
      }
    }
    return Array.from(seen.values())
  }, [stations])

  // Update all stops that share the same physicalName
  const updateByPhysicalName = (
    physicalName: string,
    updates: Partial<EditableAidStation>
  ) => {
    setStations((prev) =>
      prev.map((s) => {
        if ((s.physicalName ?? s.name) !== physicalName) return s
        const updated = { ...s, ...updates }
        // Keep physicalName in sync when name changes
        if (updates.name !== undefined) {
          updated.physicalName = updates.name
        }
        return updated
      })
    )
  }

  const addStation = () => {
    const name = `Aid Station ${uniqueGroups.filter((g) => !g.station.isStart && !g.station.isFinish).length + 1}`
    const newStation: EditableAidStation = {
      order: stations.length,
      name,
      physicalName: name,
      lat: 0,
      lon: 0,
      distanceFromStart: 0,
      distanceFromPrev: 0,
      elevationGain: 0,
      hasDropBag: false,
      hasCrewAccess: false,
      visitNumber: 1,
    }
    setStations((prev) => [...prev, newStation])
  }

  // Remove all stops that share the given physicalName
  const removeByPhysicalName = (physicalName: string) => {
    setStations((prev) => {
      const filtered = prev.filter((s) => (s.physicalName ?? s.name) !== physicalName)
      return filtered.map((s, i) => ({ ...s, order: i }))
    })
  }

  const formatDist = (km: number) =>
    unit === 'mi' ? (km * KM_TO_MI).toFixed(1) : km.toFixed(1)

  const formatDistances = (distances: number[]) =>
    distances.map((d) => `${formatDist(d)} ${unit}`).join(' & ')

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/races/${raceId}/aid-stations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aidStations: stations }),
      })
      if (!res.ok) throw new Error('Failed to save')
      router.push(`/dashboard/${raceId}`)
    } catch {
      setError('Failed to save aid stations. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading aid stations...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Confirm Aid Stations</h1>
          <p className="text-muted-foreground">
            Review and edit aid stations parsed from your GPX file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unit === 'mi' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnit('mi')}
          >
            mi
          </Button>
          <Button
            variant={unit === 'km' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnit('km')}
          >
            km
          </Button>
        </div>
      </div>

      {uniqueGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No aid stations found in GPX file.</p>
          <Button variant="outline" className="mt-4" onClick={addStation}>
            Add aid station manually
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>From Start ({unit})</TableHead>
                <TableHead className="text-center">Drop Bag</TableHead>
                <TableHead className="text-center">Crew</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueGroups.map(({ station, distances }, i) => {
                const isSpecial = station.isStart || station.isFinish
                const physicalName = station.physicalName ?? station.name
                return (
                  <TableRow key={physicalName}>
                    <TableCell className="text-muted-foreground">
                      {station.isStart ? 'S' : station.isFinish ? 'F' : i}
                    </TableCell>
                    <TableCell>
                      {isSpecial ? (
                        <span className="font-semibold">{station.name}</span>
                      ) : (
                        <Input
                          value={station.name}
                          onChange={(e) =>
                            updateByPhysicalName(physicalName, { name: e.target.value })
                          }
                          className="h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistances(distances)}
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={station.hasDropBag}
                        disabled={isSpecial}
                        onChange={(e) =>
                          updateByPhysicalName(physicalName, { hasDropBag: e.target.checked })
                        }
                        className="h-4 w-4 disabled:opacity-30"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={station.hasCrewAccess}
                        disabled={isSpecial}
                        onChange={(e) =>
                          updateByPhysicalName(physicalName, { hasCrewAccess: e.target.checked })
                        }
                        className="h-4 w-4 disabled:opacity-30"
                      />
                    </TableCell>
                    <TableCell>
                      {!isSpecial && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeByPhysicalName(physicalName)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={addStation}>
          Add station
        </Button>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Confirm & continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
