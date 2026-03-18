import { describe, it, expect } from 'vitest'
import { buildPackingCards } from '../packing-plan'
import type { AidStation } from '@/types/gpx'
import type { Section, SectionPlan } from '@/types/section'

function makeStation(order: number, name: string): AidStation {
  return {
    order,
    name,
    lat: 0,
    lon: 0,
    distanceFromStart: order * 10,
    distanceFromPrev: 10,
    elevationGain: 0,
    hasDropBag: false,
    hasCrewAccess: false,
  }
}

function makeSection(fromOrder: number, toOrder: number, durationMinutes: number | null = 60): Section {
  return {
    fromStation: makeStation(fromOrder, `Station ${fromOrder}`),
    toStation: makeStation(toOrder, `Station ${toOrder}`),
    distanceMiles: 6.2,
    distanceKm: 10,
    durationMinutes,
    departureTime: null,
    arrivalTime: null,
    refillStops: 0,
    tempAtDeparture: null,
    tempAtArrival: null,
    tempDelta: null,
    hasNight: false,
    hasSunsetOrSunrise: false,
    elevationGainFt: null,
    elevationLossFt: null,
  }
}

function makePlan(raceId: string, fromOrder: number): SectionPlan {
  return {
    raceId,
    fromStationOrder: fromOrder,
    fromStationName: `Station ${fromOrder}`,
    toStationName: `Station ${fromOrder + 1}`,
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
  }
}

describe('buildPackingCards', () => {
  it('single section → one card with one baggie', () => {
    const sections = [makeSection(0, 1)]
    const plans = [makePlan('race1', 0)]
    const cards = buildPackingCards(sections, plans, 300)

    expect(cards).toHaveLength(1)
    expect(cards[0].station.order).toBe(0)
    expect(cards[0].baggies).toHaveLength(1)
    expect(cards[0].baggies[0].computedKcal).toBe(300) // 300 cal/hr * 60 min / 60 = 300
  })

  it('multiple sections → one card per from-station with correct baggies', () => {
    const sections = [makeSection(0, 1), makeSection(1, 2), makeSection(2, 3)]
    const plans = [makePlan('race1', 0), makePlan('race1', 1), makePlan('race1', 2)]
    const cards = buildPackingCards(sections, plans, 300)

    expect(cards).toHaveLength(3)
    expect(cards.map((c) => c.station.order)).toEqual([0, 1, 2])
    cards.forEach((card) => expect(card.baggies).toHaveLength(1))
  })

  it('uses computeSectionCalories for kcal values', () => {
    const sections = [makeSection(0, 1, 120)]
    const plans = [makePlan('race1', 0)]
    const cards = buildPackingCards(sections, plans, 300)

    expect(cards[0].baggies[0].computedKcal).toBe(600) // 300 * 120 / 60
  })

  it('returns null computedKcal when caloriesPerHour is null', () => {
    const sections = [makeSection(0, 1)]
    const plans = [makePlan('race1', 0)]
    const cards = buildPackingCards(sections, plans, null)

    expect(cards[0].baggies[0].computedKcal).toBeNull()
  })

  it('sections from same physicalName → one card with two baggies', () => {
    const s1 = makeSection(0, 1)
    const s2 = makeSection(2, 3)
    s2.fromStation = { ...s2.fromStation, physicalName: 'Station 0', order: 2 }

    const sections = [s1, s2]
    const plans = [makePlan('race1', 0), makePlan('race1', 2)]
    const cards = buildPackingCards(sections, plans, null)

    expect(cards).toHaveLength(1)
    expect(cards[0].baggies).toHaveLength(2)
  })
})
