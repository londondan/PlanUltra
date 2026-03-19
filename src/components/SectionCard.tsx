'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { computeSectionCalories } from '@/lib/calories'
import { computeSunConditions } from '@/lib/sun-utils'
import type { Section, SectionPlan } from '@/types/section'
import { ConditionCard } from '@/components/ConditionCard'

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

const gearPillStyle = (key: string, checked: boolean): React.CSSProperties => {
  if (key === 'hasHeadlamp') return checked
    ? { backgroundColor: '#3730a3', color: 'white', borderColor: '#3730a3' }
    : { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#e0e7ff' }
  if (key === 'hasRainGear') return checked
    ? { backgroundColor: '#92400e', color: 'white', borderColor: '#92400e' }
    : { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fef3c7' }
  return checked
    ? { backgroundColor: '#475569', color: 'white', borderColor: '#475569' }
    : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#f1f5f9' }
}

export function SectionCard({ section, plan, caloriesPerHour, onChange, onSave, raceLat, raceLon }: SectionCardProps) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hovered, setHovered] = useState(false)
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
    hasNight,
    hasSunsetOrSunrise,
    weatherCondition,
  } = section

  const computedKcal = computeSectionCalories(caloriesPerHour, durationMinutes)
  const kcal = plan.caloriesOverride !== null ? plan.caloriesOverride : computedKcal

  const sunConditions =
    raceLat !== undefined && raceLon !== undefined
      ? computeSunConditions(section, raceLat, raceLon)
      : null

  return (
    <div className="rounded-lg border border-[rgba(130,199,246,0.55)] bg-card overflow-hidden shadow-[0_2px_6px_rgba(29,124,190,0.06)]">
      {/* Collapsed header */}
      <button
        type="button"
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          open ? 'bg-secondary border-b border-[rgba(130,199,246,0.4)]' : ''
        }`}
        style={!open && hovered ? { backgroundColor: 'var(--secondary)' } : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Mile + time badges */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="inline-flex items-center rounded text-white px-2 py-0.5 text-[11px] font-mono font-bold whitespace-nowrap" style={{ backgroundColor: '#114574' }}>
            Mile {(fromStation.distanceFromStart * 0.621371).toFixed(1)}
          </span>
          {departureTime ? (
            <span className="inline-flex items-center rounded bg-secondary text-secondary-foreground px-2 py-0.5 text-[11px] font-mono font-semibold whitespace-nowrap">
              {formatTime(departureTime)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded bg-secondary text-secondary-foreground/50 px-2 py-0.5 text-[11px] font-mono whitespace-nowrap">
              —
            </span>
          )}
        </div>

        {/* Center: title + chips */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            {fromStation.name} → {toStation.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs text-muted-foreground">{distanceMiles.toFixed(1)} mi</span>
            {elevationGainFt !== null && (
              <span className="text-xs text-muted-foreground">+{formatNumber(elevationGainFt)} ft</span>
            )}
            {durationMinutes !== null && (
              <span className="text-xs text-muted-foreground">~{formatDuration(durationMinutes)}</span>
            )}
            {weatherCondition && (
              <span className="text-xs text-muted-foreground">
                {weatherCondition.emoji} {weatherCondition.minTemp}°→{weatherCondition.maxTemp}°F
              </span>
            )}
            {hasNight && (
              <span className="text-xs text-muted-foreground">
                {sunConditions?.hasNight ? '🌙 night section' : '🌙 night'}
              </span>
            )}
            {sunConditions?.sunriseAt ? (
              <span className="text-xs text-muted-foreground">
                🌅 sunrise ~mi {sunConditions.sunriseAt.sectionMile.toFixed(0)}
              </span>
            ) : hasSunsetOrSunrise ? (
              <span className="text-xs text-muted-foreground">🌅 sunrise</span>
            ) : null}
            {sunConditions?.sunsetAt && (
              <span className="text-xs text-muted-foreground">
                🌇 sunset ~mi {sunConditions.sunsetAt.sectionMile.toFixed(0)}
              </span>
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
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {/* Start card */}
            <div className="rounded-md border border-[rgba(130,199,246,0.55)] bg-secondary px-3 py-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-0.5">Start</p>
              <p className="font-mono text-base font-bold">
                Mile {(fromStation.distanceFromStart * 0.621371).toFixed(1)}
              </p>
              {departureTime && (
                <p className="font-mono text-muted-foreground text-xs">{formatTime(departureTime)}</p>
              )}
            </div>

            {/* Distance card */}
            <div className="rounded-md border border-[rgba(130,199,246,0.55)] bg-secondary px-3 py-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-0.5">Distance</p>
              <p className="font-mono text-base font-bold">{distanceMiles.toFixed(1)} mi</p>
              {elevationGainFt !== null && (
                <p className="font-mono text-muted-foreground text-xs">
                  +{formatNumber(elevationGainFt)} / −{formatNumber(elevationLossFt ?? 0)} ft
                </p>
              )}
            </div>

            {/* Duration card */}
            {durationMinutes !== null && (
              <div className="rounded-md border border-[rgba(130,199,246,0.55)] bg-secondary px-3 py-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-0.5">Duration</p>
                <p className="font-mono text-base font-bold">{formatDuration(durationMinutes)}</p>
                {kcal !== null && (
                  <p className="font-mono text-muted-foreground text-xs">~{kcal} kcal</p>
                )}
              </div>
            )}

            {/* Weather card */}
            {weatherCondition && (
              <ConditionCard
                type={`weather-${weatherCondition.type}` as `weather-${typeof weatherCondition.type}`}
                label={`${weatherCondition.emoji} Weather`}
                value={`${weatherCondition.minTemp}°→${weatherCondition.maxTemp}°F`}
                subLabel={weatherCondition.subLabel}
                wide={weatherCondition.type === 'storm' || weatherCondition.type === 'snow'}
              />
            )}

            {/* Night card */}
            {sunConditions?.hasNight && (() => {
              let nightValue: string
              let nightSubLabel: string
              if (sunConditions.sunriseAt) {
                nightValue = `Start → ~mile ${sunConditions.sunriseAt.sectionMile.toFixed(1)}`
                nightSubLabel = `Sunrise ${formatTime(sunConditions.sunriseAt.time)} · headlamp required`
              } else if (sunConditions.sunsetAt) {
                nightValue = `~mile ${sunConditions.sunsetAt.sectionMile.toFixed(1)} → end`
                nightSubLabel = `Sunset ${formatTime(sunConditions.sunsetAt.time)} · headlamp from mile ${sunConditions.sunsetAt.sectionMile.toFixed(0)}`
              } else {
                nightValue = 'Full segment'
                nightSubLabel = 'Entire leg in darkness'
              }
              return (
                <ConditionCard
                  type="night"
                  label="🌙 Night running"
                  value={nightValue}
                  subLabel={nightSubLabel}
                />
              )
            })()}

            {/* Sunrise card */}
            {sunConditions?.sunriseAt && (
              <ConditionCard
                type="sunrise"
                label="🌅 Sunrise"
                value={`~mile ${sunConditions.sunriseAt.sectionMile.toFixed(1)} · ${formatTime(sunConditions.sunriseAt.time)}`}
                subLabel={
                  sunConditions.hasNight
                    ? `Starts dark · light by mile ${sunConditions.sunriseAt.sectionMile.toFixed(0)}`
                    : 'Sunrise near end of segment'
                }
              />
            )}

            {/* Sunset card */}
            {sunConditions?.sunsetAt && (
              <ConditionCard
                type="sunset"
                label="🌇 Sunset"
                value={`~mile ${sunConditions.sunsetAt.sectionMile.toFixed(1)} · ${formatTime(sunConditions.sunsetAt.time)}`}
                subLabel={
                  !plan.hasHeadlamp
                    ? '⚠ Headlamp not packed for this leg'
                    : `Headlamp needed from ~mile ${sunConditions.sunsetAt.sectionMile.toFixed(0)}`
                }
                warnSubLabel={!plan.hasHeadlamp}
              />
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
              <p className="text-sm font-medium">Gear at {toStation.name} <span className="text-[#94a3b8] font-normal">(drop bag)</span></p>
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
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] px-2.5 py-1 rounded-full border cursor-pointer transition-colors"
                      style={gearPillStyle(key, plan[key])}
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
