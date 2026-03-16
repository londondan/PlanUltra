import type { AidStation } from '@/types/gpx'

export interface SectionPlan {
  raceId: string
  fromStationOrder: number        // used as part of the DynamoDB sort key
  fromStationName: string
  toStationName: string
  drinkMixes: number | null
  caloriesOverride: number | null // null = use race.caloriesPerHour * sectionHours
  hasHeadlamp: boolean
  hasExtraLayer: boolean
  hasRainGear: boolean
  hasPoles: boolean
  shoeChange: boolean
  notes: string
  updatedAt: string               // ISO 8601
}

export interface Section {
  fromStation: AidStation
  toStation: AidStation
  distanceMiles: number
  distanceKm: number
  durationMinutes: number | null  // null when no pace set
  departureTime: Date | null
  arrivalTime: Date | null
  refillStops: number             // count of non-drop-bag stations in this leg
  tempAtDeparture: number | null  // °F; null if no weather data
  tempAtArrival: number | null
  tempDelta: number | null        // signed: positive = warmer, negative = colder
  hasNight: boolean
  hasSunsetOrSunrise: boolean
  elevationGainFt: number | null  // null when GPX has no elevation data
  elevationLossFt: number | null
}
