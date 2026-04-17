import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AidStation } from '@/types/gpx'

const mockSend = vi.fn()

vi.mock('@/lib/db', () => ({
  docClient: { send: mockSend },
  TABLE_NAME: 'test-table',
}))

const makeStation = (order: number, name: string): AidStation => ({
  order,
  name,
  physicalName: name,
  lat: 0,
  lon: 0,
  distanceFromStart: order * 10,
  distanceFromPrev: 10,
  grossClimbM: 0,
  grossDescentM: 0,
  elevationGain: 0,
  hasDropBag: false,
  hasCrewAccess: false,
})

describe('saveAidStations', () => {
  beforeEach(() => vi.resetAllMocks())

  it('writes stations with zero-padded SKs', async () => {
    mockSend.mockResolvedValue({})
    const { saveAidStations } = await import('@/lib/db/aid-stations')

    await saveAidStations('race-1', [makeStation(0, 'Start'), makeStation(1, 'Aid 1'), makeStation(2, 'Finish')])

    expect(mockSend).toHaveBeenCalledOnce()
    const cmd = mockSend.mock.calls[0][0]
    const items = cmd.input.RequestItems['test-table'].map(
      (r: { PutRequest: { Item: Record<string, unknown> } }) => r.PutRequest.Item
    )
    expect(items[0].SK).toBe('AID#0000')
    expect(items[1].SK).toBe('AID#0001')
    expect(items[2].SK).toBe('AID#0002')
  })

  it('splits into 25-item chunks for large station lists', async () => {
    mockSend.mockResolvedValue({})
    const { saveAidStations } = await import('@/lib/db/aid-stations')

    const stations = Array.from({ length: 30 }, (_, i) => makeStation(i, `Station ${i}`))
    await saveAidStations('race-1', stations)

    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('does nothing when given an empty array', async () => {
    const { saveAidStations } = await import('@/lib/db/aid-stations')
    await saveAidStations('race-1', [])
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('getAidStations', () => {
  beforeEach(() => vi.resetAllMocks())

  it('strips PK and SK attributes from returned items', async () => {
    mockSend.mockResolvedValue({
      Items: [
        { PK: 'RACE#r1', SK: 'AID#0000', order: 0, name: 'Start', physicalName: 'Start', lat: 37, lon: -122, distanceFromStart: 0, distanceFromPrev: 0, grossClimbM: 0, grossDescentM: 0, elevationGain: 0, hasDropBag: false, hasCrewAccess: false },
        { PK: 'RACE#r1', SK: 'AID#0001', order: 1, name: 'Finish', physicalName: 'Finish', lat: 38, lon: -121, distanceFromStart: 50, distanceFromPrev: 50, grossClimbM: 0, grossDescentM: 0, elevationGain: 0, hasDropBag: false, hasCrewAccess: false },
      ],
    })
    const { getAidStations } = await import('@/lib/db/aid-stations')
    const stations = await getAidStations('r1')

    expect(stations).toHaveLength(2)
    expect((stations[0] as unknown as Record<string, unknown>).PK).toBeUndefined()
    expect((stations[0] as unknown as Record<string, unknown>).SK).toBeUndefined()
    expect(stations[0].name).toBe('Start')
  })

  it('returns empty array when no items exist', async () => {
    mockSend.mockResolvedValue({ Items: [] })
    const { getAidStations } = await import('@/lib/db/aid-stations')
    const stations = await getAidStations('r1')
    expect(stations).toHaveLength(0)
  })
})

describe('deleteAidStations', () => {
  beforeEach(() => vi.resetAllMocks())

  it('queries real SKs then deletes by those exact values', async () => {
    // First call: QueryCommand — returns actual SKs from DynamoDB
    mockSend.mockResolvedValueOnce({ Items: [{ SK: 'AID#0001' }, { SK: 'AID#0002' }] })
    // Second call: BatchWriteCommand — delete
    mockSend.mockResolvedValueOnce({})

    const { deleteAidStations } = await import('@/lib/db/aid-stations')
    await deleteAidStations('race-1')

    expect(mockSend).toHaveBeenCalledTimes(2)
    const deleteCmd = mockSend.mock.calls[1][0]
    const deleteKeys = deleteCmd.input.RequestItems['test-table'].map(
      (r: { DeleteRequest: { Key: Record<string, string> } }) => r.DeleteRequest.Key.SK
    )
    expect(deleteKeys).toEqual(['AID#0001', 'AID#0002'])
  })

  it('does nothing when there are no aid stations', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] })
    const { deleteAidStations } = await import('@/lib/db/aid-stations')
    await deleteAidStations('race-1')
    // Only the query should be called, no batch delete
    expect(mockSend).toHaveBeenCalledOnce()
  })
})
