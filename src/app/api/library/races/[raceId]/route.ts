import { NextResponse } from 'next/server'
import { getRaceById, LIBRARY_USER_ID } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'

export async function GET(_req: Request, { params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race?.isLibraryRace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const aidStations = await getAidStations(raceId)
  return NextResponse.json({ race, aidStations })
}
