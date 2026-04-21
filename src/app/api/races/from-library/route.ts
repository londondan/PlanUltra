import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById, createRace, deleteRace, LIBRARY_USER_ID, type Race } from '@/lib/db/races'
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

  // RACE FACTS — copied verbatim from library.
  // date / startTime / timezone are overridden by the user's input (they may be
  // registering for a different year's edition or running in a different timezone).
  const raceFacts: Omit<Race, 'raceId' | 'userId' | 'createdAt'> = {
    name: libraryRace.name,
    date,
    startTime,
    timezone,
    gpxData: libraryRace.gpxData,
    gpxUrl: libraryRace.gpxUrl,
    startLat: libraryRace.startLat,
    startLon: libraryRace.startLon,
    location: libraryRace.location,
    rdName: libraryRace.rdName,
    rdPhone: libraryRace.rdPhone,
    rdEmail: libraryRace.rdEmail,
    raceWebsiteUrl: libraryRace.raceWebsiteUrl,
    // RUNNER PLAN — initialised fresh; never copied from library.
    // caloriesPerHour, targetFinishMinutes, paceOverrides, crewShareToken,
    // crewPublishedAt, runnerName, paceMode, paceMin, paceSec,
    // finishHours, finishMins — all absent (undefined by default).
    //
    // LIBRARY ONLY — not carried to user races.
    // isLibraryRace, libraryDescription — absent.
  }

  const newRace = await createRace(session.user.id, raceFacts)
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
