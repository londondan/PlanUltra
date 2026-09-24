import { NextResponse } from 'next/server'
import { getLibraryRaces } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'

export async function GET() {
  const races = await getLibraryRaces()

  const withMeta = await Promise.all(
    races.map(async ({ gpxData: _, ...r }) => {
      const stations = await getAidStations(r.raceId)
      const crewStations = stations.filter((s) => s.hasCrewAccess)
      const isComplete =
        crewStations.length > 0 &&
        crewStations.every((s) => s.crewParkingUrl || s.crewParkingCoords)
      return { ...r, isComplete }
    })
  )

  // Complete races first, then alphabetically
  withMeta.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({ races: withMeta })
}
