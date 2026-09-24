import { describe, it, expect } from 'vitest'
import { expandLaps, getVisitMiles, formatMileBadge } from '@/lib/laps'
import type { AidStation } from '@/types/gpx'

const KM_PER_MI = 1.60934

function makeStation(overrides: Partial<AidStation> & { order: number; distanceFromStart: number }): AidStation {
  return {
    name: 'Station',
    physicalName: 'Station',
    lat: 0,
    lon: 0,
    distanceFromPrev: 0,
    elevationGain: 0,
    grossClimbM: 0,
    grossDescentM: 0,
    hasDropBag: false,
    hasCrewAccess: false,
    visitNumber: 1,
    ...overrides,
  }
}

// A simple 2-station loop: Start(0) → Aid A(5mi) → Finish/Start(10mi)
const LAP_DIST_MI = 10
const LAP_DIST_KM = LAP_DIST_MI * KM_PER_MI

const baseStations: AidStation[] = [
  makeStation({ order: 0, name: 'Start', physicalName: 'Start', distanceFromStart: 0, isStart: true, hasCrewAccess: true, hasDropBag: true }),
  makeStation({ order: 1, name: 'Aid A', physicalName: 'Aid A', distanceFromStart: 5 * KM_PER_MI, hasCrewAccess: true }),
  makeStation({ order: 2, name: 'Finish', physicalName: 'Finish', distanceFromStart: LAP_DIST_KM, isFinish: true, hasCrewAccess: true, hasDropBag: true }),
]

describe('expandLaps', () => {
  it('returns stations unchanged for lapCount=1', () => {
    const result = expandLaps(baseStations, 1, LAP_DIST_MI)
    expect(result).toEqual(baseStations)
  })

  it('expands a 2-lap race to the correct station count', () => {
    // Start + Aid A (lap1) + [Start/Finish Lap 2] + Aid A (lap2) + Finish = 5
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    expect(result).toHaveLength(5)
  })

  it('expands a 3-lap race to the correct station count', () => {
    // Start + [A, transition] * 2 + [A, Finish] = 1 + 2*2 + 2 = 7
    const result = expandLaps(baseStations, 3, LAP_DIST_MI)
    expect(result).toHaveLength(7)
  })

  it('keeps Start at distance 0', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    expect(result[0].distanceFromStart).toBe(0)
    expect(result[0].isStart).toBe(true)
  })

  it('names mid-course transition "Start/Finish (Lap N)"', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    const transition = result.find((s) => s.name === 'Start/Finish (Lap 2)')
    expect(transition).toBeDefined()
    expect(transition?.isFinish).toBe(false)
    expect(transition?.isStart).toBe(false)
  })

  it('names the final station "Finish"', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    const last = result[result.length - 1]
    expect(last.name).toBe('Finish')
    expect(last.isFinish).toBe(true)
  })

  it('places the final Finish at lapCount * lapDistance', () => {
    const result = expandLaps(baseStations, 3, LAP_DIST_MI)
    const last = result[result.length - 1]
    expect(last.distanceFromStart).toBeCloseTo(3 * LAP_DIST_KM, 5)
  })

  it('places mid-course transitions at correct distances', () => {
    const result = expandLaps(baseStations, 3, LAP_DIST_MI)
    const lap2 = result.find((s) => s.name === 'Start/Finish (Lap 2)')!
    const lap3 = result.find((s) => s.name === 'Start/Finish (Lap 3)')!
    expect(lap2.distanceFromStart).toBeCloseTo(LAP_DIST_KM, 5)
    expect(lap3.distanceFromStart).toBeCloseTo(2 * LAP_DIST_KM, 5)
  })

  it('assigns sequential order numbers', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    result.forEach((s, i) => expect(s.order).toBe(i))
  })

  it('recalculates distanceFromPrev correctly', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    expect(result[0].distanceFromPrev).toBe(0)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distanceFromPrev).toBeCloseTo(
        result[i].distanceFromStart - result[i - 1].distanceFromStart,
        5
      )
    }
  })

  it('marks mid-course transitions as crew-accessible', () => {
    const result = expandLaps(baseStations, 2, LAP_DIST_MI)
    const transition = result.find((s) => s.name === 'Start/Finish (Lap 2)')!
    expect(transition.hasCrewAccess).toBe(true)
  })
})

describe('getVisitMiles', () => {
  const start = baseStations[0]
  const mid = baseStations[1]
  const finish = baseStations[2]

  it('returns single mile for lapCount=1', () => {
    expect(getVisitMiles(mid, 1, LAP_DIST_KM)).toHaveLength(1)
  })

  it('returns correct miles for a mid-race station over 3 laps', () => {
    const miles = getVisitMiles(mid, 3, LAP_DIST_KM)
    expect(miles).toHaveLength(3)
    expect(miles[0]).toBeCloseTo(5, 1)
    expect(miles[1]).toBeCloseTo(15, 1)
    expect(miles[2]).toBeCloseTo(25, 1)
  })

  it('returns only the start mile for the Start station', () => {
    const miles = getVisitMiles(start, 3, LAP_DIST_KM)
    expect(miles).toHaveLength(1)
    expect(miles[0]).toBeCloseTo(0, 1)
  })

  it('returns lapCount appearances for the Finish station', () => {
    const miles = getVisitMiles(finish, 3, LAP_DIST_KM)
    expect(miles).toHaveLength(3)
    expect(miles[0]).toBeCloseTo(10, 1)
    expect(miles[1]).toBeCloseTo(20, 1)
    expect(miles[2]).toBeCloseTo(30, 1)
  })
})

describe('formatMileBadge', () => {
  it('formats a single mile', () => {
    expect(formatMileBadge([3.1])).toBe('MI 3.1')
  })

  it('formats multiple miles separated by ·', () => {
    expect(formatMileBadge([3.1, 13.3, 23.5])).toBe('MI 3.1 · MI 13.3 · MI 23.5')
  })
})
