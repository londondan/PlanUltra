import { describe, it, expect } from 'vitest'
import { disambiguateStationNames, getStationVisitInfo } from '@/lib/utils/station-display'

describe('disambiguateStationNames', () => {
  it('returns names unchanged when there are no duplicates', () => {
    const stations = [
      { name: 'Start' },
      { name: 'Twin Lakes' },
      { name: 'Winfield' },
      { name: 'Finish' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Start',
      'Twin Lakes',
      'Winfield',
      'Finish',
    ])
  })

  it('appends (1 of 2) and (2 of 2) for two duplicate names', () => {
    const stations = [
      { name: 'Twin Lakes' },
      { name: 'Winfield' },
      { name: 'Twin Lakes' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Twin Lakes (1 of 2)',
      'Winfield',
      'Twin Lakes (2 of 2)',
    ])
  })

  it('appends correct ordinals for three duplicate names', () => {
    const stations = [
      { name: 'Turnaround' },
      { name: 'Turnaround' },
      { name: 'Turnaround' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Turnaround (1 of 3)',
      'Turnaround (2 of 3)',
      'Turnaround (3 of 3)',
    ])
  })

  it('normalises case for duplicate detection', () => {
    const stations = [
      { name: 'Twin Lakes' },
      { name: 'twin lakes' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Twin Lakes (1 of 2)',
      'twin lakes (2 of 2)',
    ])
  })

  it('normalises surrounding whitespace for duplicate detection', () => {
    const stations = [
      { name: 'Twin Lakes' },
      { name: '  Twin Lakes  ' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Twin Lakes (1 of 2)',
      '  Twin Lakes   (2 of 2)',
    ])
  })

  it('preserves original casing in output', () => {
    const stations = [
      { name: 'FISH HATCHERY' },
      { name: 'Fish Hatchery' },
    ]
    const result = disambiguateStationNames(stations)
    expect(result[0]).toBe('FISH HATCHERY (1 of 2)')
    expect(result[1]).toBe('Fish Hatchery (2 of 2)')
  })

  it('handles mixed list with some duplicates and some unique', () => {
    const stations = [
      { name: 'Start' },
      { name: 'Hope Pass' },
      { name: 'Winfield' },
      { name: 'Hope Pass' },
      { name: 'Finish' },
    ]
    expect(disambiguateStationNames(stations)).toEqual([
      'Start',
      'Hope Pass (1 of 2)',
      'Winfield',
      'Hope Pass (2 of 2)',
      'Finish',
    ])
  })

  it('returns empty array for empty input', () => {
    expect(disambiguateStationNames([])).toEqual([])
  })
})

describe('getStationVisitInfo', () => {
  it('returns visitTotal=1 and visitIndex=1 for unique stations', () => {
    const result = getStationVisitInfo([{ name: 'Start' }, { name: 'Finish' }])
    expect(result[0]).toEqual({ displayName: 'Start', visitIndex: 1, visitTotal: 1 })
    expect(result[1]).toEqual({ displayName: 'Finish', visitIndex: 1, visitTotal: 1 })
  })

  it('returns correct visitIndex and visitTotal for duplicates', () => {
    const result = getStationVisitInfo([
      { name: 'Twin Lakes' },
      { name: 'Twin Lakes' },
    ])
    expect(result[0]).toEqual({ displayName: 'Twin Lakes (1 of 2)', visitIndex: 1, visitTotal: 2 })
    expect(result[1]).toEqual({ displayName: 'Twin Lakes (2 of 2)', visitIndex: 2, visitTotal: 2 })
  })
})
