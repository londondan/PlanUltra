import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRaceById } from '@/lib/db/races'
import { upsertSectionPlan } from '@/lib/db/sections'
import type { SectionPlan } from '@/types/section'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string; sectionOrder: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId, sectionOrder } = await params
  const race = await getRaceById(session.user.id, raceId)
  if (!race) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = (await req.json()) as Partial<SectionPlan>

  const plan: SectionPlan = {
    raceId,
    fromStationOrder: parseInt(sectionOrder, 10),
    fromStationName: body.fromStationName ?? '',
    toStationName: body.toStationName ?? '',
    drinkMixes: body.drinkMixes ?? null,
    caloriesOverride: body.caloriesOverride ?? null,
    hasHeadlamp: body.hasHeadlamp ?? false,
    hasExtraLayer: body.hasExtraLayer ?? false,
    hasRainGear: body.hasRainGear ?? false,
    hasPoles: body.hasPoles ?? false,
    shoeChange: body.shoeChange ?? false,
    notes: body.notes ?? '',
    updatedAt: new Date().toISOString(),
  }

  await upsertSectionPlan(plan)
  return NextResponse.json({ success: true })
}
