import suncalc from 'suncalc'
import type { Section } from '@/types/section'

export interface SunConditions {
  hasNight: boolean
  sunriseAt?: { time: Date; sectionMile: number }
  sunsetAt?: { time: Date; sectionMile: number }
}

function interpolateMile(
  eventTime: Date,
  departureTime: Date,
  arrivalTime: Date,
  fromMile: number,
  toMile: number
): number {
  const totalMs = arrivalTime.getTime() - departureTime.getTime()
  if (totalMs <= 0) return fromMile
  const elapsedMs = eventTime.getTime() - departureTime.getTime()
  const fraction = Math.max(0, Math.min(1, elapsedMs / totalMs))
  return fromMile + fraction * (toMile - fromMile)
}

export function computeSunConditions(
  section: Section,
  raceLat: number,
  raceLon: number
): SunConditions {
  const { departureTime, arrivalTime, fromStation, toStation } = section

  if (!departureTime || !arrivalTime) {
    return { hasNight: false }
  }

  const fromMile = fromStation.distanceFromStart * 0.621371
  const toMile = toStation.distanceFromStart * 0.621371

  // Get sun times for the departure date
  const sunTimes = suncalc.getTimes(departureTime, raceLat, raceLon)
  const { sunrise, sunset, dawn, dusk } = sunTimes

  // Check if any part of the section overlaps with darkness
  // Darkness is before dawn or after dusk
  const isDark = (t: Date) => t < dawn || t > dusk

  let hasNight = false
  // Sample start, end, and midpoint
  const midTime = new Date((departureTime.getTime() + arrivalTime.getTime()) / 2)
  if (isDark(departureTime) || isDark(arrivalTime) || isDark(midTime)) {
    hasNight = true
  }

  // If section spans midnight, check next day's dawn too
  if (arrivalTime.getTime() - departureTime.getTime() > 12 * 60 * 60 * 1000) {
    hasNight = true
  }

  const result: SunConditions = { hasNight }

  // Sunrise within section window?
  if (sunrise >= departureTime && sunrise <= arrivalTime) {
    result.sunriseAt = {
      time: sunrise,
      sectionMile: interpolateMile(sunrise, departureTime, arrivalTime, fromMile, toMile),
    }
  }

  // Sunset within section window?
  if (sunset >= departureTime && sunset <= arrivalTime) {
    result.sunsetAt = {
      time: sunset,
      sectionMile: interpolateMile(sunset, departureTime, arrivalTime, fromMile, toMile),
    }
  }

  return result
}
