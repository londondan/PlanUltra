'use client'

import { useState } from 'react'
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

const GEAR_PILL_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  hasHeadlamp:   { backgroundColor: '#e0e7ff', color: '#3730a3' },
  hasRainGear:   { backgroundColor: '#fef3c7', color: '#92400e' },
  hasExtraLayer: { backgroundColor: '#f1f5f9', color: '#475569' },
  hasPoles:      { backgroundColor: '#f1f5f9', color: '#475569' },
  shoeChange:    { backgroundColor: '#f1f5f9', color: '#475569' },
}

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
      <p className="text-sm text-[#64748b] mb-3.5 leading-relaxed">
        Each drop bag listed once. Expand to see what to pack and when you&apos;ll reach it during the race.
      </p>
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
          <div key={cardKey} className="rounded-lg overflow-hidden border border-[rgba(130,199,246,0.55)] shadow-[0_2px_6px_rgba(29,124,190,0.06)]">
            <button
              type="button"
              className="w-full flex items-start gap-3 px-4 py-3 text-left text-white transition-colors"
              style={{ backgroundColor: '#114574' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0d3a63')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#114574')}
              onClick={() => toggleCard(cardKey)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-[15px] tracking-[-0.01em] leading-tight">
                  {station.name}
                </p>
                {mileSubtitle && (
                  <p className="text-xs text-white/65 mt-0.5">{mileSubtitle}</p>
                )}
              </div>
              {!isOpen && (gearSummary || baggieCount > 0) && (
                <div className="text-right text-[11px] text-white/60 leading-snug shrink-0 max-w-[40%]">
                  {gearSummary && <div>{gearSummary}</div>}
                  <div>{baggieCount} baggi{baggieCount !== 1 ? 'es' : 'e'} packed</div>
                </div>
              )}
              <span
                className="text-white/60 text-xs shrink-0 mt-0.5 transition-transform inline-block"
                style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▸
              </span>
            </button>

            {/* Expanded body */}
            {isOpen && (
              <div className="px-4 py-3.5 space-y-4">
                {/* Section A: What to pack */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#114574] mb-2">
                    What to pack
                  </p>

                  {/* Gear checklist pills (display only) */}
                  {gearItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {gearItems.map(({ key, label }) => (
                        <span
                          key={label}
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-[0.05em]"
                          style={GEAR_PILL_COLORS[key]}
                        >
                          ☐ {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {hasShoeChange && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      ⚠ Shoe change at this station — note in crew plan
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
                        className="rounded-lg border border-[rgba(130,199,246,0.5)] px-3 py-2.5 mb-1.5"
                        style={{ backgroundColor: '#DBF1FA' }}
                      >
                        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                          <span className="text-[13px] font-bold text-[#02071E]">
                            🥡 Baggie → {section.toStation.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748b]">
                            {legMiles} mi{legDur ? ` · ${legDur} leg` : ''}
                          </span>
                        </div>
                        {(plan.drinkMixes !== null && plan.drinkMixes > 0) || kcal !== null ? (
                          <p className="text-xs text-[#475569] leading-relaxed">
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
                          <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap mt-1">
                            {plan.packingList}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Section B: When do I reach this bag? */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#114574] mb-2 mt-3 first:mt-0">
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
                            className="flex items-center gap-2 py-[7px] border-b border-[rgba(130,199,246,0.2)] last:border-0"
                          >
                            <span className="font-mono text-[13px] font-bold text-[#114574] min-w-[68px] shrink-0">
                              Mile {(section.fromStation.distanceFromStart * KM_TO_MI).toFixed(1)}
                            </span>
                            <span className="font-mono text-xs text-[#64748b] w-20 shrink-0">
                              {arrival ? formatTime(arrival.estimatedArrival) : '—'}
                            </span>
                            <span className="text-xs text-[#475569] flex-1 min-w-0">
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
        <div className="rounded-lg overflow-hidden border border-[rgba(130,199,246,0.55)] shadow-[0_2px_6px_rgba(29,124,190,0.06)]">
          <div className="px-4 py-3 text-white" style={{ backgroundColor: '#114574' }}>
            <p className="font-display font-extrabold text-[15px] tracking-[-0.01em]">{lastSection.toStation.name}</p>
            {lastSection.toStation.distanceFromStart > 0 && (
              <p className="text-xs text-white/65 mt-0.5">
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
