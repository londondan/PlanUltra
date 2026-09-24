import { createHash, timingSafeEqual } from 'crypto'
import { getRaceByCrewToken, type Race } from '@/lib/db/races'

export function hashEditKey(editKey: string): string {
  return createHash('sha256').update(editKey).digest('hex')
}

export type PlanAccessResult =
  | { ok: true; race: Race }
  | { ok: false; status: 403 | 404; error: string }

export async function requirePlanEdit(
  shareToken: string,
  editKey: string
): Promise<PlanAccessResult> {
  const race = await getRaceByCrewToken(shareToken)
  if (!race) return { ok: false, status: 404, error: 'Plan not found' }
  if (!race.editKeyHash) return { ok: false, status: 403, error: 'Forbidden' }

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(hashEditKey(editKey), 'hex')
  const stored = Buffer.from(race.editKeyHash, 'hex')

  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, race }
}
