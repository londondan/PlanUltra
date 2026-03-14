import type { AidStation } from '@/types/gpx'

const KM_TO_MI = 0.621371

export type PaceConfig =
  | { mode: 'pace'; minutesPerMile: number }
  | { mode: 'finish'; targetMinutes: number; totalDistanceKm: number }

export interface ArrivalEstimate {
  order: number
  name: string
  estimatedArrival: Date
  elapsedMinutes: number
}

/**
 * Calculates estimated arrival times at each aid station.
 *
 * Stable public interface — Phase 2 will swap the internal pace algorithm
 * (e.g. Riegel's formula with elevation adjustment) without changing this signature.
 *
 * @param config  - Either a flat pace (min/mile) or a target finish time
 * @param aidStations - Ordered aid stations with distanceFromStart in km
 * @param raceStart - The race start datetime
 */
export function calculateArrivalTimes(
  config: PaceConfig,
  aidStations: AidStation[],
  raceStart: Date
): ArrivalEstimate[] {
  if (aidStations.length === 0) return []

  let minutesPerMile: number

  if (config.mode === 'pace') {
    minutesPerMile = config.minutesPerMile
  } else {
    const totalMiles = config.totalDistanceKm * KM_TO_MI
    if (totalMiles === 0) return []
    minutesPerMile = config.targetMinutes / totalMiles
  }

  return aidStations.map((station) => {
    const distanceMiles = station.distanceFromStart * KM_TO_MI
    const elapsedMinutes = distanceMiles * minutesPerMile

    const arrival = new Date(raceStart.getTime() + elapsedMinutes * 60 * 1000)

    return {
      order: station.order,
      name: station.name,
      estimatedArrival: arrival,
      elapsedMinutes,
    }
  })
}
