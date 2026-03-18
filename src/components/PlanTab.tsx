'use client'

import { useState, useRef } from 'react'
import { SectionCard } from '@/components/SectionCard'
import { DropBagSummary } from '@/components/DropBagSummary'
import { computeSections } from '@/lib/section-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Race } from '@/lib/db/races'
import type { AidStation, TrackPoint } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { RaceWeatherEntry } from '@/lib/weather-timeline'
import type { Section, SectionPlan } from '@/types/section'

interface PlanTabProps {
  raceId: string
  race: Race
  aidStations: AidStation[]
  arrivalEstimates: ArrivalEstimate[]
  weatherEntries: RaceWeatherEntry[]
  trackPoints: TrackPoint[]
  initialSectionPlans: SectionPlan[]
  raceStart: Date
}

function defaultPlan(raceId: string, section: Section): SectionPlan {
  return {
    raceId,
    fromStationOrder: section.fromStation.order,
    fromStationName: section.fromStation.name,
    toStationName: section.toStation.name,
    drinkMixes: null,
    caloriesOverride: null,
    hasHeadlamp: false,
    hasExtraLayer: false,
    hasRainGear: false,
    hasPoles: false,
    shoeChange: false,
    notes: '',
    updatedAt: '',
  }
}

export function PlanTab({
  raceId,
  race,
  aidStations,
  arrivalEstimates,
  weatherEntries,
  trackPoints,
  initialSectionPlans,
  raceStart,
}: PlanTabProps) {
  const [sectionPlans, setSectionPlans] = useState<SectionPlan[]>(initialSectionPlans)
  const [caloriesPerHour, setCaloriesPerHour] = useState<number | null>(race.caloriesPerHour ?? null)
  const calDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sections = computeSections(aidStations, arrivalEstimates, weatherEntries, trackPoints, raceStart)

  const handleChange = (order: number, updates: Partial<SectionPlan>) => {
    setSectionPlans((prev) => {
      const idx = prev.findIndex((p) => p.fromStationOrder === order)
      if (idx >= 0) {
        return prev.map((p) => (p.fromStationOrder === order ? { ...p, ...updates } : p))
      }
      const section = sections.find((s) => s.fromStation.order === order)!
      return [...prev, { ...defaultPlan(raceId, section), ...updates }]
    })
  }

  const handleCaloriesPerHourChange = (value: number | null) => {
    setCaloriesPerHour(value)
    if (calDebounceRef.current) clearTimeout(calDebounceRef.current)
    calDebounceRef.current = setTimeout(() => {
      fetch(`/api/races/${raceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caloriesPerHour: value }),
      })
    }, 600)
  }

  const handleSave = async (plan: SectionPlan) => {
    await fetch(`/api/races/${raceId}/sections/${plan.fromStationOrder}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {arrivalEstimates.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Set your pace above to see time estimates and weather context for each section.
        </div>
      )}
      <div className="flex items-center gap-3">
        <Label htmlFor="calories-per-hour" className="whitespace-nowrap">Calories / hr</Label>
        <Input
          id="calories-per-hour"
          type="number"
          min="0"
          className="w-32"
          value={caloriesPerHour ?? ''}
          onChange={(e) =>
            handleCaloriesPerHourChange(e.target.value === '' ? null : Number(e.target.value))
          }
        />
      </div>
      {sections.map((section) => (
        <SectionCard
          key={section.fromStation.order}
          section={section}
          plan={
            sectionPlans.find((p) => p.fromStationOrder === section.fromStation.order) ??
            defaultPlan(raceId, section)
          }
          caloriesPerHour={caloriesPerHour}
          onChange={(updates) => handleChange(section.fromStation.order, updates)}
          onSave={handleSave}
        />
      ))}
      {sections.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground">Drop Bag Summary</h3>
          <DropBagSummary
            sections={sections}
            sectionPlans={sectionPlans}
            caloriesPerHour={caloriesPerHour ?? undefined}
          />
        </>
      )}
    </div>
  )
}
