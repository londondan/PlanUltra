import { NextRequest, NextResponse } from 'next/server'
import { requirePlanEdit } from '@/lib/plan-access'
import { resolveGoogleMapsInput } from '@/lib/maps'
import { checkRateLimit } from '@/lib/rate-limit'

const ERROR_MESSAGES: Record<string, string> = {
  coords_not_found:
    "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly.",
  invalid_format: 'Invalid format. Use a Google Maps link or enter lat,lng directly.',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`resolve:${ip}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { shareToken } = await params
  const editKey = req.headers.get('x-edit-key') ?? ''
  const access = await requirePlanEdit(shareToken, editKey)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = (await req.json()) as { input?: string }
  const input = body?.input?.trim()
  if (!input) {
    return NextResponse.json({ success: false, reason: 'invalid_format' }, { status: 400 })
  }

  const result = await resolveGoogleMapsInput(input)
  if (result.ok) {
    return NextResponse.json({ success: true, coords: result.coords })
  }

  return NextResponse.json({
    success: false,
    reason: result.reason,
    error: ERROR_MESSAGES[result.reason] ?? 'Unable to resolve location.',
  })
}
