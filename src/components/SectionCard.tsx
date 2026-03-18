'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { computeSectionCalories } from '@/lib/calories'
import { computeSunConditions } from '@/lib/sun-utils'
import type { Section, SectionPlan } from '@/types/section'

interface SectionCardProps {
  section: Section
  plan: SectionPlan
  caloriesPerHour: number | null
  onChange: (updates: Partial<SectionPlan>) => void
  onSave: (plan: SectionPlan) => void
  raceLat?: number
  raceLon?: number
}

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function SectionCard({ section, plan, caloriesPerHour, onChange, onSave, raceLat, raceLon }: SectionCardProps) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const planRef = useRef<SectionPlan>(plan)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    planRef.current = plan
  }, [plan])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleChange = (updates: Partial<SectionPlan>) => {
    const merged = { ...planRef.current, ...updates }
    planRef.current = merged
    onChange(updates)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSave(planRef.current)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    }, 600)
  }

  const {
    fromStation,
    toStation,
    distanceMiles,
    durationMinutes,
    departureTime,
    elevationGainFt,
    elevationLossFt,
    tempAtDeparture,
    tempAtArrival,
    hasNight,
    hasSunsetOrSunrise,
  } = section

  const computedKcal = computeSectionCalories(caloriesPerHour, durationMinutes)
  const kcal = plan.caloriesOverride !== null ? plan.caloriesOverride : computedKcal

  const sunConditions =
    raceLat !== undefined && raceLon !== undefined
      ? computeSunConditions(section, raceLat, raceLon)
      : null

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Collapsed header */}
      <button
        type="button"
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          open ? 'bg-muted/40 border-b' : 'hover:bg-muted/20'
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Mile + time badges */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="inline-flex items-center rounded-full bg-foreground text-background px-2 py-0.5 text-xs font-mono font-medium">
            Mile {(fromStation.distanceFromStart * 0.621371).toFixed(1)}
          </span>
          {departureTime ? (
            <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-xs font-mono">
              {formatTime(departureTime)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-mono">
              —
            </span>
          )}
        </div>

        {/* Center: title + chips */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {fromStation.name} → {toStation.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {distanceMiles.toFixed(1)} mi
            </Badge>
            {elevationGainFt !== null && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{formatNumber(elevationGainFt)} ft
              </Badge>
            )}
            {durationMinutes !== null && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                ~{formatDuration(durationMinutes)}
              </Badge>
            )}
            {tempAtDeparture !== null && tempAtArrival !== null && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                ⛅ {Math.round(tempAtDeparture)}°→{Math.round(tempAtArrival)}°F
              </Badge>
            )}
            {hasNight && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Night
              </Badge>
            )}
            {hasSunsetOrSunrise && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Sunset/Sunrise
              </Badge>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 py-4 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
            {/* Start card */}
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground font-medium mb-0.5">Start</p>
              <p className="font-mono">
                Mile {(fromStation.distanceFromStart * 0.621371).toFixed(1)}
              </p>
              {departureTime && (
                <p className="font-mono text-muted-foreground">{formatTime(departureTime)}</p>
              )}
            </div>

            {/* Distance card */}
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground font-medium mb-0.5">Distance</p>
              <p className="font-mono">{distanceMiles.toFixed(1)} mi</p>
              {elevationGainFt !== null && (
                <p className="font-mono text-muted-foreground">
                  +{formatNumber(elevationGainFt)} / −{formatNumber(elevationLossFt ?? 0)} ft
                </p>
              )}
            </div>

            {/* Duration card */}
            {durationMinutes !== null && (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                <p className="text-muted-foreground font-medium mb-0.5">Duration</p>
                <p className="font-mono">{formatDuration(durationMinutes)}</p>
                {kcal !== null && (
                  <p className="font-mono text-muted-foreground">~{kcal} kcal</p>
                )}
              </div>
            )}

            {/* Weather card */}
            {tempAtDeparture !== null && (
              <div className="rounded-md border bg-gradient-to-br from-sky-50 to-sky-100 px-3 py-2 text-xs">
                <p className="text-sky-700 font-medium mb-0.5">Weather</p>
                <p className="font-mono text-sky-900">
                  {Math.round(tempAtDeparture)}°→{tempAtArrival !== null ? Math.round(tempAtArrival) : '?'}°F
                </p>
              </div>
            )}

            {/* Night card */}
            {sunConditions?.hasNight && (
              <div className="rounded-md border bg-gradient-to-r from-[#1e1b4b] to-[#312e81] px-3 py-2 text-xs text-white">
                <p className="font-medium mb-0.5 opacity-80">Night running</p>
                <p>This section crosses darkness</p>
              </div>
            )}

            {/* Sunrise card */}
            {sunConditions?.sunriseAt && (
              <div className="rounded-md border bg-gradient-to-r from-[#fff7ed] to-[#fed7aa] px-3 py-2 text-xs">
                <p className="text-orange-700 font-medium mb-0.5">Sunrise</p>
                <p className="font-mono text-orange-900">
                  ~mile {sunConditions.sunriseAt.sectionMile.toFixed(1)}
                </p>
                <p className="text-orange-700">
                  {sunConditions.sunriseAt.time.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            )}

            {/* Sunset card */}
            {sunConditions?.sunsetAt && (
              <div className="rounded-md border bg-gradient-to-r from-[#faf5ff] to-[#e9d5ff] px-3 py-2 text-xs">
                <p className="text-purple-700 font-medium mb-0.5">Sunset</p>
                <p className="font-mono text-purple-900">
                  ~mile {sunConditions.sunsetAt.sectionMile.toFixed(1)}
                </p>
                <p className="text-purple-700">
                  {sunConditions.sunsetAt.time.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Save indicator */}
          {saved && (
            <p className="text-xs text-green-600 font-medium">✓ Saved</p>
          )}

          {/* Inputs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor={`drink-mixes-${fromStation.order}`}>Drink mixes</Label>
              <Input
                id={`drink-mixes-${fromStation.order}`}
                type="number"
                min="0"
                max="20"
                value={plan.drinkMixes ?? ''}
                onChange={(e) =>
                  handleChange({ drinkMixes: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`calories-${fromStation.order}`}>
                Calories
                {plan.caloriesOverride !== null ? (
                  <span className="ml-1 text-muted-foreground font-normal text-xs">(override)</span>
                ) : (
                  <span className="ml-1 text-muted-foreground font-normal text-xs">(auto)</span>
                )}
              </Label>
              {plan.caloriesOverride === null && computedKcal !== null && (
                <div className="flex h-9 items-center text-sm text-muted-foreground">
                  ~{computedKcal} kcal
                </div>
              )}
              <Input
                id={`calories-${fromStation.order}`}
                type="number"
                min="0"
                placeholder={plan.caloriesOverride === null ? 'override kcal' : ''}
                value={plan.caloriesOverride ?? ''}
                onChange={(e) =>
                  handleChange({
                    caloriesOverride: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Gear checkboxes (only for drop-bag stations) */}
          {toStation.hasDropBag && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Gear</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'hasHeadlamp', label: 'Headlamp' },
                    { key: 'hasExtraLayer', label: 'Extra layer' },
                    { key: 'hasRainGear', label: 'Rain gear' },
                    { key: 'hasPoles', label: 'Poles' },
                    { key: 'shoeChange', label: 'Shoe change' },
                  ] as const
                ).map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                      plan[key]
                        ? 'bg-foreground text-background border-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={plan[key]}
                      onChange={(e) => handleChange({ [key]: e.target.checked })}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Packing list */}
          <div className="space-y-1">
            <Label htmlFor={`packing-list-${fromStation.order}`}>Packing list</Label>
            <textarea
              id={`packing-list-${fromStation.order}`}
              rows={3}
              value={plan.packingList}
              onChange={(e) => handleChange({ packingList: e.target.value })}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
              placeholder="List food to pack for this segment, e.g. 4× gel, 2× bar, 1× rice ball"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor={`crew-notes-${fromStation.order}`}>Notes</Label>
            <textarea
              id={`crew-notes-${fromStation.order}`}
              rows={3}
              value={plan.crewNotes}
              onChange={(e) => handleChange({ crewNotes: e.target.value })}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
              placeholder="Reminders, crew instructions, anything else"
            />
          </div>
        </div>
      )}
    </div>
  )
}
