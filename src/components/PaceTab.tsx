'use client'

import { useState, useRef } from 'react'
import { calculateArrivalTimesWithOverrides, type ArrivalEstimate } from '@/lib/pace-calculator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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

function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatPace(minutesPerMile: number): string {
  const m = Math.floor(minutesPerMile)
  const s = Math.round((minutesPerMile - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const overrideStyle: React.CSSProperties = {
  border: '1px solid rgba(29,124,190,0.5)',
  boxShadow: '0 0 0 3px rgba(29,124,190,0.08)',
}

const errorStyle: React.CSSProperties = {
  border: '2px solid #ef4444',
  boxShadow: '0 0 0 3px rgba(239,68,68,0.12)',
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

  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>(
    () => race.paceOverrides ?? {}
  )
  const [overrideErrors, setOverrideErrors] = useState<Set<string>>(new Set())
  const [savedIndicator, setSavedIndicator] = useState(false)

  const targetMinutes = hh || mm ? parseInt(hh || '0') * 60 + parseInt(mm || '0') : null

  const estimates =
    targetMinutes && totalMiles > 0
      ? calculateArrivalTimesWithOverrides(targetMinutes, aidStations, raceStart, localOverrides)
      : []

  const avgMinutesPerMile = targetMinutes && totalMiles > 0 ? targetMinutes / totalMiles : null

  const handleFinishBlur = () => {
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
      const newEstimates = calculateArrivalTimesWithOverrides(
        minutes,
        aidStations,
        raceStart,
        localOverrides
      )
      onArrivalEstimatesChange(newEstimates)
    } else {
      onArrivalEstimatesChange([])
    }
  }

  const saveOverrides = (overrides: Record<string, string>) => {
    fetch(`/api/races/${race.raceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paceOverrides: overrides }),
    }).then(() => {
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    })
  }

  const handleCellBlur = (
    station: AidStation,
    idx: number,
    value: string
  ) => {
    const orderStr = String(station.order)

    if (!value.trim()) {
      const updated = { ...localOverrides }
      delete updated[orderStr]
      setLocalOverrides(updated)
      setOverrideErrors((prev) => {
        const s = new Set(prev)
        s.delete(orderStr)
        return s
      })
      saveOverrides(updated)
      if (targetMinutes) {
        onArrivalEstimatesChange(
          calculateArrivalTimesWithOverrides(targetMinutes, aidStations, raceStart, updated)
        )
      }
      return
    }

    const parts = value.split(':')
    const rawH = parseInt(parts[0])
    const rawM = parseInt(parts[1] ?? '0')
    if (isNaN(rawH) || isNaN(rawM)) {
      setOverrideErrors((prev) => new Set(prev).add(orderStr))
      return
    }

    // Construct a candidate Date based on the current estimate's calendar date
    const baseDate = estimates[idx]?.estimatedArrival ?? raceStart
    const candidate = new Date(baseDate)
    candidate.setHours(rawH, rawM, 0, 0)

    const prevArrival = idx > 0 ? estimates[idx - 1].estimatedArrival : raceStart
    const nextArrival = idx < estimates.length - 1 ? estimates[idx + 1].estimatedArrival : null

    // If before previous anchor, shift forward 24h (overnight race)
    if (candidate <= prevArrival) {
      candidate.setDate(candidate.getDate() + 1)
    }

    const isValid =
      candidate > prevArrival && (nextArrival === null || candidate < nextArrival)

    if (isValid) {
      const updated = { ...localOverrides, [orderStr]: candidate.toISOString() }
      setLocalOverrides(updated)
      setOverrideErrors((prev) => {
        const s = new Set(prev)
        s.delete(orderStr)
        return s
      })
      saveOverrides(updated)
      if (targetMinutes) {
        onArrivalEstimatesChange(
          calculateArrivalTimesWithOverrides(targetMinutes, aidStations, raceStart, updated)
        )
      }
    } else {
      setOverrideErrors((prev) => new Set(prev).add(orderStr))
    }
  }

  const handleReset = () => {
    setLocalOverrides({})
    setOverrideErrors(new Set())
    saveOverrides({})
    if (targetMinutes) {
      onArrivalEstimatesChange(
        calculateArrivalTimesWithOverrides(targetMinutes, aidStations, raceStart, {})
      )
    }
  }

  const hasAnyOverride = Object.keys(localOverrides).length > 0

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
            onBlur={handleFinishBlur}
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
            onBlur={handleFinishBlur}
          />
        </div>
        {avgMinutesPerMile && totalMiles > 0 && (
          <p className="text-sm text-muted-foreground">
            That&apos;s a{' '}
            <span className="font-medium text-foreground">
              {formatPace(avgMinutesPerMile)} /mile
            </span>{' '}
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
          <>
            <div className="rounded-lg border border-[rgba(130,199,246,0.55)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium">Segment</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                      Start mi
                    </th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Dist</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                      Est. pace
                    </th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                      Arrive at
                    </th>
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

                    const prevElapsedMin = i > 0 ? estimates[i - 1].elapsedMinutes : 0
                    const segmentMinutes = est.elapsedMinutes - prevElapsedMin
                    const effectivePace =
                      legDistMi > 0 ? segmentMinutes / legDistMi : null

                    const isStart = currentStation?.isStart === true
                    const orderStr = String(est.order)
                    const hasOverride = !isStart && orderStr in localOverrides
                    const hasError = overrideErrors.has(orderStr)

                    return (
                      <tr
                        key={est.order}
                        style={{
                          backgroundColor:
                            i % 2 === 0 ? 'rgba(219,241,250,0.3)' : 'transparent',
                        }}
                      >
                        <td className="px-3 py-2">{segmentLabel}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                          {startMileMi.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                          {legDistMi.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground font-mono whitespace-nowrap">
                          {effectivePace ? formatPace(effectivePace) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          {isStart ? (
                            <span className="font-mono font-bold text-secondary-foreground">
                              {formatTime(est.estimatedArrival)}
                            </span>
                          ) : (
                            <input
                              type="time"
                              defaultValue={formatTimeInput(est.estimatedArrival)}
                              key={`${est.order}-${est.estimatedArrival.getTime()}`}
                              style={hasError ? errorStyle : hasOverride ? overrideStyle : undefined}
                              className="font-mono font-bold text-secondary-foreground text-right bg-transparent rounded px-1 py-0.5 w-24 border border-border/25 hover:border-border/60 hover:bg-muted/20 focus:border-border focus:bg-muted/20 focus:outline-none cursor-pointer transition-colors"
                              onBlur={(e) => handleCellBlur(currentStation!, i, e.target.value)}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!hasAnyOverride && (
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Tap any arrival time to override it.
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {hasAnyOverride && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset to defaults
                </Button>
              )}
              {savedIndicator && (
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono, monospace)',
                    fontSize: '11px',
                    opacity: 0.4,
                  }}
                >
                  Saved
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
