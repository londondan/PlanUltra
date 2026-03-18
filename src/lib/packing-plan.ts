import { computeSectionCalories } from '@/lib/calories'
import type { AidStation } from '@/types/gpx'
import type { Section, SectionPlan } from '@/types/section'

export interface PackingBaggie {
  section: Section
  plan: SectionPlan
  computedKcal: number | null
}

export interface PackingCard {
  station: AidStation
  baggies: PackingBaggie[]
}

const EMPTY_PLAN = (raceId: string, order: number): SectionPlan => ({
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
  packingList: '',
  crewNotes: '',
  updatedAt: '',
})

export function buildPackingCards(
  sections: Section[],
  sectionPlans: SectionPlan[],
  caloriesPerHour: number | null
): PackingCard[] {
  const cardMap = new Map<number, PackingCard>()

  for (const section of sections) {
    const stationOrder = section.fromStation.order
    if (!cardMap.has(stationOrder)) {
      cardMap.set(stationOrder, { station: section.fromStation, baggies: [] })
    }
    const plan =
      sectionPlans.find((p) => p.fromStationOrder === stationOrder) ??
      EMPTY_PLAN(sectionPlans[0]?.raceId ?? '', stationOrder)

    const computedKcal = computeSectionCalories(caloriesPerHour, section.durationMinutes)
    cardMap.get(stationOrder)!.baggies.push({ section, plan, computedKcal })
  }

  return Array.from(cardMap.values())
}
