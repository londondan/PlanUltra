import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getRaceById, updateRace, deleteRace, LIBRARY_USER_ID } from '@/lib/db/races'
import { deleteAidStations } from '@/lib/db/aid-stations'
import { deleteSectionPlans } from '@/lib/db/sections'

async function checkAdmin() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) return null
  return session
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''
  const updates: Record<string, unknown> = {}

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    for (const [key, value] of form.entries()) {
      if (key === 'gpx') {
        updates.gpxData = await (value as File).text()
      } else {
        updates[key] = String(value)
      }
    }
  } else {
    const body = await req.json()
    Object.assign(updates, body)
  }

  await updateRace(LIBRARY_USER_ID, raceId, updates as Parameters<typeof updateRace>[2])
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteAidStations(raceId)
  await deleteSectionPlans(raceId)
  await deleteRace(LIBRARY_USER_ID, raceId)

  return NextResponse.json({ success: true })
}
