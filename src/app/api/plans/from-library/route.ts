import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'
import { getRaceById, createRace, LIBRARY_USER_ID } from '@/lib/db/races'
import { getAidStations, saveAidStations } from '@/lib/db/aid-stations'
import { hashEditKey } from '@/lib/plan-access'
import { checkRateLimit } from '@/lib/rate-limit'

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`plans-lib:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { libraryRaceId } = await req.json()
  if (!libraryRaceId) {
    return NextResponse.json({ error: 'Missing libraryRaceId' }, { status: 400 })
  }

  const libraryRace = await getRaceById(LIBRARY_USER_ID, libraryRaceId)
  if (!libraryRace || !libraryRace.isLibraryRace) {
    return NextResponse.json({ error: 'Library race not found' }, { status: 404 })
  }

  const editKey = randomBytes(32).toString('hex')
  const editKeyHash = hashEditKey(editKey)
  const crewShareToken = randomBytes(12).toString('base64url')
  const userId = `ANON#${randomUUID()}`

  const race = await createRace(userId, {
    name: libraryRace.name,
    date: libraryRace.date,
    startTime: libraryRace.startTime ?? '',
    timezone: libraryRace.timezone ?? 'UTC',
    startLat: libraryRace.startLat,
    startLon: libraryRace.startLon,
    location: libraryRace.location,
    crewShareToken,
    editKeyHash,
    lapCount: libraryRace.lapCount ?? 1,
    sourceLibraryRaceId: libraryRaceId,
  })

  try {
    const stations = await getAidStations(libraryRaceId)
    if (stations.length > 0) {
      const copied = stations.map(({ crewParkingCoordsSource: _src, ...s }) => s)
      await saveAidStations(race.raceId, copied)
    }
  } catch (err) {
    console.error('from-library copy failed:', err)
    return NextResponse.json({ error: 'Failed to copy race data' }, { status: 500 })
  }

  return NextResponse.json({ shareToken: crewShareToken, editKey, raceId: race.raceId }, { status: 201 })
}
