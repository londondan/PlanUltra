import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createRace, getRacesByUser } from '@/lib/db/races'
import { saveAidStations } from '@/lib/db/aid-stations'
import { parseGPX, extractAidStations } from '@/lib/gpx-parser'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const races = await getRacesByUser(session.user.id)
  return NextResponse.json({ races })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let name: string, date: string, startTime: string, timezone: string, gpxString: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    name = String(form.get('name') ?? '')
    date = String(form.get('date') ?? '')
    startTime = String(form.get('startTime') ?? '')
    timezone = String(form.get('timezone') ?? 'UTC')
    const file = form.get('gpx') as File | null
    gpxString = file ? await file.text() : undefined
  } else {
    const body = await req.json()
    name = body.name
    date = body.date
    startTime = body.startTime
    timezone = body.timezone ?? 'UTC'
    gpxString = body.gpx
  }

  if (!name || !date || !startTime) {
    return NextResponse.json({ error: 'Missing required fields: name, date, startTime' }, { status: 400 })
  }

  let parsedGPX: ReturnType<typeof parseGPX> | undefined
  if (gpxString) {
    try {
      parsedGPX = parseGPX(gpxString)
    } catch {
      return NextResponse.json({ error: 'Invalid GPX file' }, { status: 400 })
    }
  }

  const race = await createRace(session.user.id, { name, date, startTime, timezone, gpxData: gpxString })

  if (parsedGPX) {
    const aidStations = extractAidStations(parsedGPX.waypoints, parsedGPX.trackPoints)
    if (aidStations.length > 0) {
      await saveAidStations(race.raceId, aidStations)
    }
  }

  return NextResponse.json({ race }, { status: 201 })
}
