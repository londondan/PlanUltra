import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getLibraryRaces } from '@/lib/db/races'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const races = await getLibraryRaces()
  // Strip GPX data — not needed for the race picker
  const stripped = races.map(({ gpxData: _, ...r }) => r)
  return NextResponse.json({ races: stripped })
}
