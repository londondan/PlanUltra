'use client'

import { useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Section, SectionPlan } from '@/types/section'

interface SectionCardProps {
  section: Section
  plan: SectionPlan
  caloriesPerHour: number | undefined
  onChange: (updates: Partial<SectionPlan>) => void
  onSave: (plan: SectionPlan) => void
}

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

function formatTempDelta(delta: number): string {
  return delta >= 0 ? `+${Math.round(delta)}°` : `−${Math.round(Math.abs(delta))}°`
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function SectionCard({ section, plan, caloriesPerHour, onChange, onSave }: SectionCardProps) {
  const planRef = useRef<SectionPlan>(plan)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    planRef.current = plan
  }, [plan])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (updates: Partial<SectionPlan>) => {
    const merged = { ...planRef.current, ...updates }
    planRef.current = merged
    onChange(updates)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSave(planRef.current), 600)
  }

  const { fromStation, toStation, distanceMiles, distanceKm, durationMinutes, refillStops,
    tempAtDeparture, tempAtArrival, tempDelta, hasNight, hasSunsetOrSunrise,
    elevationGainFt, elevationLossFt } = section

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fromStation.name} → {toStation.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {distanceMiles.toFixed(1)} mi / {distanceKm.toFixed(1)} km
          </Badge>

          <Badge variant="secondary">
            {durationMinutes !== null ? formatDuration(durationMinutes) : '—'}
          </Badge>

          {refillStops > 0 && (
            <Badge variant="secondary">{refillStops} refill stop{refillStops !== 1 ? 's' : ''}</Badge>
          )}

          {tempAtDeparture !== null && (
            <Badge variant="secondary">
              {Math.round(tempAtDeparture)}°→{tempAtArrival !== null ? `${Math.round(tempAtArrival)}°` : '?°'}F
              {tempDelta !== null && ` (${formatTempDelta(tempDelta)})`}
            </Badge>
          )}

          {hasNight && <Badge variant="outline">Night</Badge>}
          {hasSunsetOrSunrise && <Badge variant="outline">Sunset/Sunrise</Badge>}

          {elevationGainFt !== null && (
            <Badge variant="secondary">
              +{formatNumber(elevationGainFt)} ft / −{formatNumber(elevationLossFt ?? 0)} ft
            </Badge>
          )}
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor={`calories-${fromStation.order}`}>Cal/hr override</Label>
            <Input
              id={`calories-${fromStation.order}`}
              type="number"
              placeholder={caloriesPerHour !== undefined ? String(caloriesPerHour) : ''}
              value={plan.caloriesOverride ?? ''}
              onChange={(e) =>
                handleChange({ caloriesOverride: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </div>
        </div>

        {/* Gear checkboxes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Gear</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                { key: 'hasHeadlamp', label: 'Headlamp' },
                { key: 'hasExtraLayer', label: 'Extra layer' },
                { key: 'hasRainGear', label: 'Rain gear' },
                { key: 'hasPoles', label: 'Poles' },
                { key: 'shoeChange', label: 'Shoe change' },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan[key]}
                  onChange={(e) => handleChange({ [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor={`notes-${fromStation.order}`}>Notes</Label>
          <textarea
            id={`notes-${fromStation.order}`}
            rows={3}
            value={plan.notes}
            onChange={(e) => handleChange({ notes: e.target.value })}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
            placeholder="Notes for this section..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
