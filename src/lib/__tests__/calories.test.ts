import { describe, it, expect } from 'vitest'
import { computeSectionCalories } from '../calories'

describe('computeSectionCalories', () => {
  it('computes correctly for 300 cal/hr over 120 minutes', () => {
    expect(computeSectionCalories(300, 120)).toBe(600)
  })

  it('computes correctly for 300 cal/hr over 90 minutes', () => {
    expect(computeSectionCalories(300, 90)).toBe(450)
  })

  it('returns null when caloriesPerHour is null', () => {
    expect(computeSectionCalories(null, 90)).toBeNull()
  })

  it('returns null when durationMinutes is null', () => {
    expect(computeSectionCalories(300, null)).toBeNull()
  })
})
