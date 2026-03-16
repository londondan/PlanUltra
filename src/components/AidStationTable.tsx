'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AidStation } from '@/types/gpx'

interface ArrivalEstimate {
  order: number
  estimatedArrival: Date | null
}

interface AidStationTableProps {
  aidStations: AidStation[]
  arrivalEstimates?: ArrivalEstimate[]
}

const KM_TO_MI = 0.621371

function formatTime(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function rowLabel(station: AidStation): string {
  if (station.isStart) return 'S'
  if (station.isFinish) return 'F'
  return String(station.order + 1)
}

function displayName(station: AidStation): string {
  const visit = station.visitNumber ?? 1
  return visit > 1 ? `${station.name} (${visit})` : station.name
}

export function AidStationTable({ aidStations, arrivalEstimates = [] }: AidStationTableProps) {
  const [unit, setUnit] = useState<'mi' | 'km'>('mi')

  const getArrival = (order: number) =>
    arrivalEstimates.find((a) => a.order === order)?.estimatedArrival ?? null

  const formatDist = (km: number) =>
    unit === 'mi'
      ? `${(km * KM_TO_MI).toFixed(1)} mi`
      : `${km.toFixed(1)} km`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Aid Stations</h3>
        <div className="flex gap-1">
          <Button
            variant={unit === 'mi' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUnit('mi')}
          >
            mi
          </Button>
          <Button
            variant={unit === 'km' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUnit('km')}
          >
            km
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>From Start</TableHead>
              <TableHead>Leg</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Est. Arrival</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aidStations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No aid stations configured
                </TableCell>
              </TableRow>
            ) : (
              aidStations.map((station) => {
                const isSpecial = station.isStart || station.isFinish
                return (
                  <TableRow key={station.order}>
                    <TableCell className="font-medium text-muted-foreground">
                      {rowLabel(station)}
                    </TableCell>
                    <TableCell className={isSpecial ? 'font-bold' : 'font-medium'}>
                      {displayName(station)}
                    </TableCell>
                    <TableCell>{formatDist(station.distanceFromStart)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      +{formatDist(station.distanceFromPrev)}
                    </TableCell>
                    <TableCell>
                      {!isSpecial && (
                        <div className="flex gap-1 flex-wrap">
                          {station.hasDropBag && (
                            <Badge variant="secondary" className="text-xs">Drop Bag</Badge>
                          )}
                          {station.hasCrewAccess && (
                            <Badge variant="outline" className="text-xs">Crew</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-primary font-semibold">
                      {formatTime(getArrival(station.order))}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
