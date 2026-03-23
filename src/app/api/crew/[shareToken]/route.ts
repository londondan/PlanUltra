import { NextRequest, NextResponse } from 'next/server'
import { getRaceByCrewToken } from '@/lib/db/races'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const race = await getRaceByCrewToken(shareToken)

  if (!race) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ raceName: race.name, raceId: race.raceId })
}
