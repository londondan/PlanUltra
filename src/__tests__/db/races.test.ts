import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()
const mockDeleteAidStations = vi.fn()
const mockDeleteSectionPlans = vi.fn()

vi.mock('@/lib/db', () => ({
  docClient: { send: mockSend },
  TABLE_NAME: 'test-table',
}))

vi.mock('@/lib/db/aid-stations', () => ({
  deleteAidStations: mockDeleteAidStations,
  saveAidStations: vi.fn(),
  getAidStations: vi.fn(),
  updateAidStation: vi.fn(),
  chunkArray: vi.fn(),
}))

vi.mock('@/lib/db/sections', () => ({
  deleteSectionPlans: mockDeleteSectionPlans,
  getSectionPlans: vi.fn(),
  upsertSectionPlan: vi.fn(),
}))

describe('deleteRace', () => {
  beforeEach(() => vi.resetAllMocks())

  it('cascades to aid stations and sections before deleting the race record', async () => {
    mockDeleteAidStations.mockResolvedValue(undefined)
    mockDeleteSectionPlans.mockResolvedValue(undefined)
    mockSend.mockResolvedValue({})

    const { deleteRace } = await import('@/lib/db/races')
    await deleteRace('user-1', 'race-1')

    expect(mockDeleteAidStations).toHaveBeenCalledWith('race-1')
    expect(mockDeleteSectionPlans).toHaveBeenCalledWith('race-1')
    expect(mockSend).toHaveBeenCalledOnce()
    const cmd = mockSend.mock.calls[0][0]
    expect(cmd.input.Key).toEqual({ PK: 'USER#user-1', SK: 'RACE#race-1' })
  })

  it('deletes child items before the race record', async () => {
    const callOrder: string[] = []
    mockDeleteAidStations.mockImplementation(() => { callOrder.push('aid'); return Promise.resolve() })
    mockDeleteSectionPlans.mockImplementation(() => { callOrder.push('sections'); return Promise.resolve() })
    mockSend.mockImplementation(() => { callOrder.push('race'); return Promise.resolve({}) })

    const { deleteRace } = await import('@/lib/db/races')
    await deleteRace('user-1', 'race-1')

    expect(callOrder.indexOf('race')).toBeGreaterThan(callOrder.indexOf('aid'))
    expect(callOrder.indexOf('race')).toBeGreaterThan(callOrder.indexOf('sections'))
  })
})

describe('createRace', () => {
  beforeEach(() => vi.resetAllMocks())

  it('compresses gpxData before writing to DynamoDB', async () => {
    mockSend.mockResolvedValue({})
    const { createRace } = await import('@/lib/db/races')

    const rawGPX = '<gpx></gpx>'
    const race = await createRace('user-1', {
      name: 'Test Race',
      date: '2024-06-15',
      startTime: '06:00',
      timezone: 'UTC',
      gpxData: rawGPX,
    })

    const cmd = mockSend.mock.calls[0][0]
    const writtenItem = cmd.input.Item
    // The stored value should not be the raw GPX string
    expect(writtenItem.gpxData).not.toBe(rawGPX)
    // But the returned race object should be the raw string
    expect(race.gpxData).toBe(rawGPX)
  })
})

describe('getRaceById', () => {
  beforeEach(() => vi.resetAllMocks())

  it('decompresses gpxData in the returned race', async () => {
    const { gzipSync } = await import('zlib')
    const rawGPX = '<gpx><trk></trk></gpx>'
    const compressed = gzipSync(Buffer.from(rawGPX, 'utf8')).toString('base64')

    mockSend.mockResolvedValue({
      Item: {
        PK: 'USER#u1',
        SK: 'RACE#r1',
        raceId: 'r1',
        userId: 'u1',
        name: 'My Race',
        date: '2024-06-15',
        startTime: '06:00',
        timezone: 'UTC',
        createdAt: '2024-01-01T00:00:00Z',
        gpxData: compressed,
      },
    })

    const { getRaceById } = await import('@/lib/db/races')
    const race = await getRaceById('u1', 'r1')

    expect(race?.gpxData).toBe(rawGPX)
  })

  it('returns null when the race does not exist', async () => {
    mockSend.mockResolvedValue({ Item: undefined })
    const { getRaceById } = await import('@/lib/db/races')
    const race = await getRaceById('u1', 'missing')
    expect(race).toBeNull()
  })
})
