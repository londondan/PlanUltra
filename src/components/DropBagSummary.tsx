'use client'

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import type { Section, SectionPlan } from '@/types/section'

interface DropBagSummaryProps {
  sections: Section[]
  sectionPlans: SectionPlan[]
  caloriesPerHour: number | undefined
}

function gearList(plan: SectionPlan): string {
  const items: string[] = []
  if (plan.hasHeadlamp) items.push('Headlamp')
  if (plan.hasExtraLayer) items.push('Extra layer')
  if (plan.hasRainGear) items.push('Rain gear')
  if (plan.hasPoles) items.push('Poles')
  if (plan.shoeChange) items.push('Shoe change')
  return items.length > 0 ? items.join(', ') : '—'
}

const defaultPlan = (raceId: string, order: number): SectionPlan => ({
  raceId,
  fromStationOrder: order,
  fromStationName: '',
  toStationName: '',
  drinkMixes: null,
  caloriesOverride: null,
  hasHeadlamp: false,
  hasExtraLayer: false,
  hasRainGear: false,
  hasPoles: false,
  shoeChange: false,
  notes: '',
  updatedAt: '',
})

export function DropBagSummary({ sections, sectionPlans, caloriesPerHour }: DropBagSummaryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bag #</TableHead>
          <TableHead>Station</TableHead>
          <TableHead>Reach</TableHead>
          <TableHead>Drink mixes</TableHead>
          <TableHead>Cal/hr</TableHead>
          <TableHead>Gear</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section, idx) => {
          const plan =
            sectionPlans.find((p) => p.fromStationOrder === section.fromStation.order) ??
            defaultPlan('', section.fromStation.order)
          const reach = section.arrivalTime
            ? section.arrivalTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            : '—'
          return (
            <TableRow key={section.fromStation.order}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{section.toStation.name}</TableCell>
              <TableCell>{reach}</TableCell>
              <TableCell>{plan.drinkMixes ?? '—'}</TableCell>
              <TableCell>{plan.caloriesOverride ?? caloriesPerHour ?? '—'}</TableCell>
              <TableCell>{gearList(plan)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
