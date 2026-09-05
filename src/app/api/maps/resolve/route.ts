import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveGoogleMapsInput } from '@/lib/maps'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { input?: string }
  const input = body?.input?.trim()
  if (!input) {
    return NextResponse.json({ success: false, reason: 'invalid_format' }, { status: 400 })
  }

  const result = await resolveGoogleMapsInput(input)
  if (result.ok) {
    return NextResponse.json({ success: true, coords: result.coords })
  }
  const ERROR_MESSAGES: Record<string, string> = {
    coords_not_found: "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly.",
    invalid_format: 'Invalid format. Use a Google Maps link or enter lat,lng directly.',
  }
  return NextResponse.json({
    success: false,
    reason: result.reason,
    error: ERROR_MESSAGES[result.reason] ?? 'Unable to resolve location.',
  })
}
