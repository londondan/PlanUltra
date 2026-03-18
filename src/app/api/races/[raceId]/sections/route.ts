import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById } from '@/lib/db/races'
import { getSectionPlans } from '@/lib/db/sections'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId } = await params
  const race = await getRaceById(session.user.id, raceId)
  if (!race) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sectionPlans = await getSectionPlans(raceId)
  return NextResponse.json({ sectionPlans })
}
