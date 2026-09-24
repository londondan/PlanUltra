import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'
import { createRace } from '@/lib/db/races'
import { saveAidStations } from '@/lib/db/aid-stations'
import { parseAndExtractStations } from '@/lib/gpx-ingest'
import { hashEditKey } from '@/lib/plan-access'
import { checkRateLimit } from '@/lib/rate-limit'

const GPX_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`plans:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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
    if (file) {
      if (file.size > GPX_MAX_BYTES) {
        return NextResponse.json({ error: 'GPX file too large (max 10 MB)' }, { status: 400 })
      }
      gpxString = await file.text()
    }
  } else {
    const body = await req.json()
    name = body.name
    date = body.date
    startTime = body.startTime ?? ''
    timezone = body.timezone ?? 'UTC'
    gpxString = body.gpx
  }

  if (!name || !date) {
    return NextResponse.json({ error: 'Missing required fields: name, date' }, { status: 400 })
  }

  let aidStations: ReturnType<typeof parseAndExtractStations> = []
  if (gpxString) {
    try {
      aidStations = parseAndExtractStations(gpxString)
    } catch {
      return NextResponse.json({ error: 'Invalid GPX file' }, { status: 400 })
    }
  }

  const editKey = randomBytes(32).toString('hex')
  const editKeyHash = hashEditKey(editKey)
  const crewShareToken = randomBytes(12).toString('base64url')
  const userId = `ANON#${randomUUID()}`

  const race = await createRace(userId, {
    name,
    date,
    startTime: startTime ?? '',
    timezone,
    gpxData: gpxString,
    crewShareToken,
    editKeyHash,
    lapCount: 1,
  })

  if (aidStations.length > 0) {
    await saveAidStations(race.raceId, aidStations)
  }

  return NextResponse.json({ shareToken: crewShareToken, editKey, raceId: race.raceId }, { status: 201 })
}
