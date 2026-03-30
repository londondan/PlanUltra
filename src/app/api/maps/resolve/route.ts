import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveGoogleMapsInput } from '@/lib/maps'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { input?: unknown }
  if (typeof body.input !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const result = await resolveGoogleMapsInput(body.input)
  if (result.ok) {
    return NextResponse.json({ success: true, coords: result.coords })
  }

  return NextResponse.json({
    success: false,
    reason: result.reason,
    error:
      result.reason === 'invalid_format'
        ? 'Invalid format. Use a Google Maps link or enter lat,lng directly.'
        : result.reason === 'coords_not_found'
          ? "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly."
          : "Couldn't resolve that link right now. Try again or enter lat,lng directly.",
  })
}
