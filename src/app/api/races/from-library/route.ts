import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById, createRace, deleteRace, LIBRARY_USER_ID } from '@/lib/db/races'
import { getSectionPlans, upsertSectionPlan } from '@/lib/db/sections'
import { getAidStations, saveAidStations } from '@/lib/db/aid-stations'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { libraryRaceId, date, startTime, timezone } = await req.json()
  if (!libraryRaceId || !date || !startTime || !timezone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const libraryRace = await getRaceById(LIBRARY_USER_ID, libraryRaceId)
  if (!libraryRace || !libraryRace.isLibraryRace) {
    return NextResponse.json({ error: 'Library race not found' }, { status: 403 })
  }

  // Strip library-only and identity fields; override with user's date/time/timezone
  const {
    raceId: _libId,
    userId: _libUser,
    createdAt: _created,
    crewShareToken: _token,
    crewPublishedAt: _pub,
    runnerName: _runner,
    isLibraryRace: _isLib,
    libraryDescription: _desc,
    ...libraryFields
  } = libraryRace

  const newRace = await createRace(session.user.id, {
    ...libraryFields,
    date,
    startTime,
    timezone,
  })
  try {
    const [aidStations, sectionPlans] = await Promise.all([
      getAidStations(libraryRaceId),
      getSectionPlans(libraryRaceId),
    ])

    if (aidStations.length > 0) {
      const stationsForUser = aidStations.map(({ crewParkingCoordsSource: _src, ...s }) => s)
      await saveAidStations(newRace.raceId, stationsForUser)
    }

    for (const plan of sectionPlans) {
      await upsertSectionPlan({ ...plan, raceId: newRace.raceId })
    }
  } catch (err) {
    // Clean up the partially-created race so the user doesn't end up with a ghost
    await deleteRace(session.user.id, newRace.raceId)
    console.error('from-library copy failed:', err)
    return NextResponse.json({ error: 'Failed to copy race data' }, { status: 500 })
  }

  return NextResponse.json({ race: newRace }, { status: 201 })
}
