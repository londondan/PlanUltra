'use client'

import { buildPackingCards } from '@/lib/packing-plan'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Section, SectionPlan } from '@/types/section'

const KM_TO_MI = 0.621371

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

interface PackingPlanProps {
  sections: Section[]
  sectionPlans: SectionPlan[]
  caloriesPerHour: number | null
}

const GEAR_ITEMS = [
  { key: 'hasHeadlamp', label: 'Headlamp' },
  { key: 'hasExtraLayer', label: 'Extra layer' },
  { key: 'hasRainGear', label: 'Rain gear' },
  { key: 'hasPoles', label: 'Poles' },
  { key: 'shoeChange', label: 'Shoe change' },
] as const

export function PackingPlan({ sections, sectionPlans, caloriesPerHour }: PackingPlanProps) {
  const cards = buildPackingCards(sections, sectionPlans, caloriesPerHour)
  const lastSection = sections[sections.length - 1]

  return (
    <div className="space-y-4">
      {cards.map(({ station, baggies }) => {
        const gearItems = GEAR_ITEMS.filter(({ key }) =>
          baggies.some(({ plan }) => plan[key])
        )

        return (
          <Card key={station.order}>
            <CardHeader>
              <CardTitle className="text-base">
                {station.name}
                {station.distanceFromStart > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    mile {(station.distanceFromStart * KM_TO_MI).toFixed(1)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gearItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {gearItems.map(({ label }) => (
                    <Badge key={label} variant="secondary">{label}</Badge>
                  ))}
                </div>
              )}

              {baggies.map(({ section, plan, computedKcal }) => {
                const kcal = plan.caloriesOverride !== null ? plan.caloriesOverride : computedKcal

                return (
                  <div key={section.toStation.order} className="space-y-1 rounded-md border p-3">
                    <p className="text-sm font-medium">To {section.toStation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {section.distanceMiles.toFixed(1)} mi
                      {' · '}
                      {section.durationMinutes ? formatDuration(section.durationMinutes) : '—'}
                    </p>

                    {(plan.drinkMixes !== null && plan.drinkMixes > 0) && (
                      <p className="text-sm">{plan.drinkMixes}× drink mix</p>
                    )}

                    <p className="text-sm">
                      {kcal !== null ? `~${Math.round(kcal)} kcal` : '—'}
                    </p>

                    {plan.packingList && (
                      <p className="text-sm whitespace-pre-wrap">{plan.packingList}</p>
                    )}
                    {!plan.packingList && (
                      <p className="text-sm text-muted-foreground italic">No packing list</p>
                    )}

                    {plan.crewNotes && (
                      <div className="pt-1">
                        <p className="text-xs font-medium text-muted-foreground">Notes for crew</p>
                        <p className="text-sm whitespace-pre-wrap">{plan.crewNotes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {lastSection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {lastSection.toStation.name}
              {lastSection.toStation.distanceFromStart > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  mile {(lastSection.toStation.distanceFromStart * KM_TO_MI).toFixed(1)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
