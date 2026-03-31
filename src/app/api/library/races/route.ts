import { NextResponse } from 'next/server'
import { getLibraryRaces } from '@/lib/db/races'

export async function GET() {
  const races = await getLibraryRaces()
  // Strip GPX data — not needed for the race picker
  const stripped = races.map(({ gpxData: _, ...r }) => r)
  stripped.sort((a, b) => a.date.localeCompare(b.date))
  return NextResponse.json({ races: stripped })
}
