import { NextRequest, NextResponse } from 'next/server'
import { requirePlanEdit } from '@/lib/plan-access'
import { updateRace } from '@/lib/db/races'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const editKey = req.headers.get('x-edit-key') ?? ''
  const access = await requirePlanEdit(shareToken, editKey)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { race } = access
  const body = await req.json()

  // Allow updating safe, non-identity fields only
  type AllowedUpdates = { lapCount?: number; name?: string; date?: string; startTime?: string; timezone?: string }
  const updates: AllowedUpdates = {}
  if (typeof body.lapCount === 'number') updates.lapCount = body.lapCount
  if (typeof body.name === 'string') updates.name = body.name
  if (typeof body.date === 'string') updates.date = body.date
  if (typeof body.startTime === 'string') updates.startTime = body.startTime
  if (typeof body.timezone === 'string') updates.timezone = body.timezone

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  await updateRace(race.userId, race.raceId, updates)
  return NextResponse.json({ ok: true })
}
