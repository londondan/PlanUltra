export interface StationVisitInfo {
  displayName: string
  visitIndex: number
  visitTotal: number
}

export function getStationVisitInfo(
  stations: { name: string }[]
): StationVisitInfo[] {
  const counts = new Map<string, number>()
  for (const s of stations) {
    const key = s.name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const visitsSeen = new Map<string, number>()
  return stations.map((s) => {
    const key = s.name.trim().toLowerCase()
    const total = counts.get(key) ?? 1
    const visit = (visitsSeen.get(key) ?? 0) + 1
    visitsSeen.set(key, visit)

    if (total === 1) {
      return { displayName: s.name, visitIndex: 1, visitTotal: 1 }
    }
    return {
      displayName: `${s.name} (${visit} of ${total})`,
      visitIndex: visit,
      visitTotal: total,
    }
  })
}

export function disambiguateStationNames(
  stations: { name: string }[]
): string[] {
  return getStationVisitInfo(stations).map((v) => v.displayName)
}
