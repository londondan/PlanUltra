import type { Race } from '@/lib/db/races'
import type { AidStation } from '@/types/gpx'
import type { SectionPlan } from '@/types/section'

const PREFIX = 'planultra_guest_'

export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`${PREFIX}mode`) === 'true'
}

export function activateGuestMode(): void {
  localStorage.setItem(`${PREFIX}mode`, 'true')
  if (!localStorage.getItem(`${PREFIX}id`)) {
    localStorage.setItem(`${PREFIX}id`, crypto.randomUUID())
  }
  document.cookie = 'pua_guest=1; path=/; SameSite=Lax'
}

export function clearGuestData(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}

export function getGuestId(): string {
  const id = localStorage.getItem(`${PREFIX}id`)
  if (id) return id
  const newId = crypto.randomUUID()
  localStorage.setItem(`${PREFIX}id`, newId)
  return newId
}

export function getGuestRaces(): Race[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}races`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function upsertGuestRace(race: Race): void {
  const races = getGuestRaces()
  const idx = races.findIndex((r) => r.raceId === race.raceId)
  if (idx >= 0) {
    races[idx] = race
  } else {
    races.push(race)
  }
  localStorage.setItem(`${PREFIX}races`, JSON.stringify(races))
}

export function deleteGuestRace(raceId: string): void {
  const races = getGuestRaces().filter((r) => r.raceId !== raceId)
  localStorage.setItem(`${PREFIX}races`, JSON.stringify(races))
  localStorage.removeItem(`${PREFIX}race_${raceId}_aidstations`)
  localStorage.removeItem(`${PREFIX}race_${raceId}_sections`)
}

export function getGuestRaceById(raceId: string): Race | null {
  return getGuestRaces().find((r) => r.raceId === raceId) ?? null
}

export function getGuestAidStations(raceId: string): AidStation[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}race_${raceId}_aidstations`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveGuestAidStations(raceId: string, stations: AidStation[]): void {
  localStorage.setItem(`${PREFIX}race_${raceId}_aidstations`, JSON.stringify(stations))
}

export function getGuestSections(raceId: string): SectionPlan[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}race_${raceId}_sections`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function upsertGuestSection(raceId: string, plan: SectionPlan): void {
  const sections = getGuestSections(raceId)
  const idx = sections.findIndex((s) => s.fromStationOrder === plan.fromStationOrder)
  if (idx >= 0) {
    sections[idx] = plan
  } else {
    sections.push(plan)
  }
  localStorage.setItem(`${PREFIX}race_${raceId}_sections`, JSON.stringify(sections))
}
