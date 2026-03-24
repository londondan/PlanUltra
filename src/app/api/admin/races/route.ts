import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { createRace, getLibraryRaces, LIBRARY_USER_ID } from '@/lib/db/races'
import { saveAidStations } from '@/lib/db/aid-stations'
import { parseGPX, extractAidStations } from '@/lib/gpx-parser'

async function checkAdmin() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) return null
  return session
}

export async function GET() {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const races = await getLibraryRaces()
  return NextResponse.json({ races })
}

export async function POST(req: NextRequest) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const contentType = req.headers.get('content-type') ?? ''
  let name: string,
    date: string,
    startTime: string,
    timezone: string,
    location: string | undefined,
    libraryDescription: string | undefined,
    gpxString: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    name = String(form.get('name') ?? '')
    date = String(form.get('date') ?? '')
    startTime = String(form.get('startTime') ?? '')
    timezone = String(form.get('timezone') ?? 'UTC')
    location = form.get('location') ? String(form.get('location')) : undefined
    libraryDescription = form.get('libraryDescription')
      ? String(form.get('libraryDescription'))
      : undefined
    const file = form.get('gpx') as File | null
    gpxString = file ? await file.text() : undefined
  } else {
    const body = await req.json()
    name = body.name
    date = body.date
    startTime = body.startTime
    timezone = body.timezone ?? 'UTC'
    location = body.location
    libraryDescription = body.libraryDescription
    gpxString = body.gpx
  }

  if (!name || !date || !startTime) {
    return NextResponse.json(
      { error: 'Missing required fields: name, date, startTime' },
      { status: 400 }
    )
  }

  const race = await createRace(LIBRARY_USER_ID, {
    name,
    date,
    startTime,
    timezone,
    gpxData: gpxString,
    location,
    libraryDescription,
    isLibraryRace: true,
  })

  if (gpxString) {
    const { trackPoints, waypoints } = parseGPX(gpxString)
    const aidStations = extractAidStations(waypoints, trackPoints)
    if (aidStations.length > 0) {
      await saveAidStations(race.raceId, aidStations)
    }
  }

  return NextResponse.json({ race }, { status: 201 })
}
