'use client'

import { useState, useRef } from 'react'
import { calculateArrivalTimes, type ArrivalEstimate } from '@/lib/pace-calculator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AidStation } from '@/types/gpx'
import type { Race } from '@/lib/db/races'

const KM_TO_MI = 0.621371

interface PaceTabProps {
  race: Race
  aidStations: AidStation[]
  raceStart: Date
  onArrivalEstimatesChange: (estimates: ArrivalEstimate[]) => void
}

function minutesToHHMM(minutes: number): { hh: string; mm: string } {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return { hh: String(h).padStart(2, '0'), mm: String(m).padStart(2, '0') }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatPace(minutesPerMile: number): string {
  const m = Math.floor(minutesPerMile)
  const s = Math.round((minutesPerMile - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PaceTab({ race, aidStations, raceStart, onArrivalEstimatesChange }: PaceTabProps) {
  const totalKm =
    aidStations.length > 0 ? aidStations[aidStations.length - 1].distanceFromStart : 0
  const totalMiles = totalKm * KM_TO_MI

  const initial = race.targetFinishMinutes
    ? minutesToHHMM(race.targetFinishMinutes)
    : { hh: '', mm: '' }

  const [hh, setHh] = useState(initial.hh)
  const [mm, setMm] = useState(initial.mm)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const targetMinutes = hh || mm ? parseInt(hh || '0') * 60 + parseInt(mm || '0') : null

  const estimates =
    targetMinutes && totalMiles > 0
      ? calculateArrivalTimes(
          { mode: 'finish', targetMinutes, totalDistanceKm: totalKm },
          aidStations,
          raceStart
        )
      : []

  const minutesPerMile = targetMinutes && totalMiles > 0 ? targetMinutes / totalMiles : null

  const handleBlur = () => {
    const minutes = targetMinutes
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/races/${race.raceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFinishMinutes: minutes }),
      })
    }, 0)
    if (minutes && totalMiles > 0) {
      const newEstimates = calculateArrivalTimes(
        { mode: 'finish', targetMinutes: minutes, totalDistanceKm: totalKm },
        aidStations,
        raceStart
      )
      onArrivalEstimatesChange(newEstimates)
    } else {
      onArrivalEstimatesChange([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Finish time input */}
      <div className="space-y-2">
        <Label>Target finish time (HH:MM)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="99"
            className="w-20 text-center"
            placeholder="HH"
            value={hh}
            onChange={(e) => setHh(e.target.value)}
            onBlur={handleBlur}
          />
          <span className="text-muted-foreground font-medium">:</span>
          <Input
            type="number"
            min="0"
            max="59"
            className="w-20 text-center"
            placeholder="MM"
            value={mm}
            onChange={(e) => setMm(e.target.value)}
            onBlur={handleBlur}
          />
        </div>
        {minutesPerMile && totalMiles > 0 && (
          <p className="text-sm text-muted-foreground">
            That&apos;s a{' '}
            <span className="font-medium text-foreground">{formatPace(minutesPerMile)} /mile</span>{' '}
            average pace across {totalMiles.toFixed(1)} miles.
          </p>
        )}
      </div>

      {/* Split table */}
      <div>
        {estimates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Set your target finish time above to see projected splits.
          </p>
        ) : (
          <div className="rounded-lg border border-[rgba(130,199,246,0.55)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium">Segment</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Start mi</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Dist</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Est. pace</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Arrive at</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((est, i) => {
                  const currentStation = aidStations.find((s) => s.order === est.order)
                  const prevStation = aidStations
                    .filter((s) => s.order < est.order)
                    .sort((a, b) => b.order - a.order)[0]
                  const startMileMi = (prevStation?.distanceFromStart ?? 0) * KM_TO_MI
                  const endMileMi = (currentStation?.distanceFromStart ?? 0) * KM_TO_MI
                  const legDistMi = endMileMi - startMileMi
                  const segmentLabel = prevStation
                    ? `${prevStation.name} → ${est.name}`
                    : `Start → ${est.name}`
                  return (
                    <tr
                      key={est.order}
                      style={{ backgroundColor: i % 2 === 0 ? 'rgba(219,241,250,0.3)' : 'transparent' }}
                    >
                      <td className="px-3 py-2">{segmentLabel}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                        {startMileMi.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                        {legDistMi.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                        {minutesPerMile ? formatPace(minutesPerMile) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-secondary-foreground whitespace-nowrap">
                        {formatTime(est.estimatedArrival)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
