'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { buildPackingCards } from '@/lib/packing-plan'
import type { Section, SectionPlan } from '@/types/section'
import type { ArrivalEstimate } from '@/lib/pace-calculator'

const KM_TO_MI = 0.621371

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const GEAR_ITEMS = [
  { key: 'hasHeadlamp', label: 'Headlamp' },
  { key: 'hasExtraLayer', label: 'Extra layer' },
  { key: 'hasRainGear', label: 'Rain gear' },
  { key: 'hasPoles', label: 'Poles' },
  { key: 'shoeChange', label: 'Shoe change' },
] as const

interface PackingPlanProps {
  sections: Section[]
  sectionPlans: SectionPlan[]
  caloriesPerHour: number | null
  arrivalEstimates?: ArrivalEstimate[]
}

export function PackingPlan({
  sections,
  sectionPlans,
  caloriesPerHour,
  arrivalEstimates = [],
}: PackingPlanProps) {
  const cards = buildPackingCards(sections, sectionPlans, caloriesPerHour)
  const lastSection = sections[sections.length - 1]
  const [openCards, setOpenCards] = useState<Set<string>>(() => {
    const first = cards[0]?.station.physicalName ?? cards[0]?.station.name
    return first ? new Set([first]) : new Set()
  })

  const toggleCard = (key: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasPace = arrivalEstimates.length > 0

  return (
    <div className="space-y-3">
      {cards.map(({ station, baggies }) => {
        const cardKey = station.physicalName ?? station.name
        const isOpen = openCards.has(cardKey)

        const gearItems = GEAR_ITEMS.filter(({ key }) => baggies.some(({ plan }) => plan[key]))
        const hasShoeChange = baggies.some(({ plan }) => plan.shoeChange)

        const visitMiles = [...new Set(baggies.map((b) => b.section.fromStation.distanceFromStart))]
          .sort((a, b) => a - b)
          .map((m) => (m * KM_TO_MI).toFixed(1))

        const mileSubtitle =
          visitMiles.length > 1
            ? `Miles ${visitMiles.join(' & ')} · visited ${visitMiles.length} times`
            : visitMiles.length === 1
            ? `Mile ${visitMiles[0]}`
            : ''

        const gearSummary = gearItems.map((g) => g.label).join(' · ')
        const baggieCount = baggies.length

        return (
          <div key={cardKey} className="rounded-lg overflow-hidden border border-[#1a2e44]/20">
            {/* Collapsed header */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left bg-[#1a3a4a] text-white"
              onClick={() => toggleCard(cardKey)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-tight">{station.name}</p>
                {mileSubtitle && (
                  <p className="text-xs text-white/70 mt-0.5">{mileSubtitle}</p>
                )}
                {(gearSummary || baggieCount > 0) && (
                  <p className="text-xs text-white/60 mt-0.5 truncate">
                    {[gearSummary, `${baggieCount} baggi${baggieCount !== 1 ? 'es' : 'e'} packed`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-white/60 transition-transform"
                style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Expanded body */}
            {isOpen && (
              <div className="px-4 py-4 space-y-5">
                {/* Section A: What to pack */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What to pack
                  </p>

                  {/* Gear checklist pills (display only) */}
                  {gearItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {gearItems.map(({ label }) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-foreground text-background"
                        >
                          ✓ {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {hasShoeChange && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                      ⚠ Shoe change at this station
                    </p>
                  )}

                  {/* Baggie blocks */}
                  {baggies.map(({ section, plan, computedKcal }) => {
                    const kcal =
                      plan.caloriesOverride !== null ? plan.caloriesOverride : computedKcal
                    const legMiles = section.distanceMiles.toFixed(1)
                    const legDur = section.durationMinutes
                      ? `~${formatDuration(section.durationMinutes)}`
                      : null

                    return (
                      <div
                        key={section.toStation.order}
                        className="rounded-md border bg-muted/20 p-3 space-y-1.5"
                      >
                        <p className="text-sm font-medium">
                          🥡 Baggie → {section.toStation.name}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {legMiles} mi{legDur ? ` · ${legDur} leg` : ''}
                        </p>
                        {(plan.drinkMixes !== null && plan.drinkMixes > 0) || kcal !== null ? (
                          <p className="text-xs text-muted-foreground">
                            {[
                              plan.drinkMixes !== null && plan.drinkMixes > 0
                                ? `${plan.drinkMixes}× drink mix`
                                : null,
                              kcal !== null ? `~${Math.round(kcal)} kcal` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                        {plan.packingList && (
                          <p className="text-xs whitespace-pre-wrap">{plan.packingList}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Section B: When do I reach this bag? */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    When do I reach this bag?
                  </p>
                  {hasPace ? (
                    <div className="space-y-1">
                      {baggies.map(({ section }) => {
                        const arrival = arrivalEstimates.find(
                          (e) => e.order === section.fromStation.order
                        )
                        const prevName =
                          section.fromStation.order === 0 ? null : section.fromStation.name
                        return (
                          <div
                            key={section.fromStation.order}
                            className="flex items-center gap-3 text-xs py-1.5 border-b last:border-0"
                          >
                            <span className="font-mono font-bold w-16 shrink-0">
                              Mile {(section.fromStation.distanceFromStart * KM_TO_MI).toFixed(1)}
                            </span>
                            <span className="font-mono text-muted-foreground w-20 shrink-0">
                              {arrival ? formatTime(arrival.estimatedArrival) : '—'}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {prevName ? `Arriving from ${prevName}` : 'Race start'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Set a finish time in the Pace tab to see arrival estimates.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Finish line card */}
      {lastSection && (
        <div className="rounded-lg overflow-hidden border border-[#1a2e44]/20">
          <div className="px-4 py-3 bg-[#1a3a4a] text-white">
            <p className="font-bold text-base">{lastSection.toStation.name}</p>
            {lastSection.toStation.distanceFromStart > 0 && (
              <p className="text-xs text-white/70 mt-0.5">
                Mile {(lastSection.toStation.distanceFromStart * KM_TO_MI).toFixed(1)} · Finish
              </p>
            )}
            {hasPace && (() => {
              const est = arrivalEstimates.find((e) => e.order === lastSection.toStation.order)
              return est ? (
                <p className="text-xs font-mono text-white/80 mt-0.5">
                  {formatTime(est.estimatedArrival)}
                </p>
              ) : null
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
