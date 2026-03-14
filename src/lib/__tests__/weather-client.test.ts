import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchForecast, weatherCodeToCondition } from '@/lib/weather-client'

const mockForecastResponse = {
  hourly: {
    time: [
      '2024-06-15T00:00',
      '2024-06-15T01:00',
      '2024-06-15T06:00',
      '2024-06-15T12:00',
    ],
    temperature_2m: [55.4, 52.1, 60.8, 78.2],
    precipitation_probability: [10, 5, 0, 20],
    wind_speed_10m: [5.2, 4.1, 8.3, 12.4],
    weather_code: [0, 0, 1, 3],
    is_day: [0, 0, 1, 1],
  },
}

describe('fetchForecast', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns available: false when race is more than 16 days out', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 20)
    const dateStr = futureDate.toISOString().split('T')[0]

    const result = await fetchForecast(37.7749, -122.4194, dateStr, dateStr, 'America/Los_Angeles')
    expect(result.available).toBe(false)
    expect(result.forecasts).toHaveLength(0)
    expect(result.reason).toContain('16')
  })

  it('builds correct API request URL with required parameters', async () => {
    let capturedUrl = ''
    vi.stubGlobal('fetch', async (url: string) => {
      capturedUrl = url
      return {
        ok: true,
        json: async () => mockForecastResponse,
      }
    })

    const today = new Date().toISOString().split('T')[0]
    await fetchForecast(37.7749, -122.4194, today, today, 'America/Los_Angeles')

    expect(capturedUrl).toContain('api.open-meteo.com')
    expect(capturedUrl).toContain('latitude=37.7749')
    expect(capturedUrl).toContain('longitude=-122.4194')
    expect(capturedUrl).toContain('temperature_2m')
    expect(capturedUrl).toContain('precipitation_probability')
    expect(capturedUrl).toContain('wind_speed_10m')
    expect(capturedUrl).toContain('weather_code')
    expect(capturedUrl).toContain('America%2FLos_Angeles')
  })

  it('parses API response into structured HourlyForecast array', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => mockForecastResponse,
    }))

    const today = new Date().toISOString().split('T')[0]
    const result = await fetchForecast(37.7749, -122.4194, today, today, 'UTC')

    expect(result.available).toBe(true)
    expect(result.forecasts).toHaveLength(4)

    const first = result.forecasts[0]
    expect(first.time).toBe('2024-06-15T00:00')
    expect(first.temperature).toBe(55.4)
    expect(first.precipitationProbability).toBe(10)
    expect(first.windSpeed).toBe(5.2)
    expect(first.weatherCode).toBe(0)
    expect(first.isNight).toBe(true)
  })

  it('isNight is true when is_day is 0', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => mockForecastResponse,
    }))

    const today = new Date().toISOString().split('T')[0]
    const result = await fetchForecast(0, 0, today, today, 'UTC')

    const nightHour = result.forecasts.find((f) => f.time === '2024-06-15T00:00')
    const dayHour = result.forecasts.find((f) => f.time === '2024-06-15T06:00')
    expect(nightHour?.isNight).toBe(true)
    expect(dayHour?.isNight).toBe(false)
  })

  it('throws on API error', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    }))

    const today = new Date().toISOString().split('T')[0]
    await expect(fetchForecast(0, 0, today, today, 'UTC')).rejects.toThrow('429')
  })

  it('throws on network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('Network error')
    })

    const today = new Date().toISOString().split('T')[0]
    await expect(fetchForecast(0, 0, today, today, 'UTC')).rejects.toThrow('Network error')
  })
})

describe('weatherCodeToCondition', () => {
  it('maps code 0 to Clear', () => {
    const { label } = weatherCodeToCondition(0)
    expect(label).toBe('Clear')
  })

  it('maps code 61-67 to Rain', () => {
    const { label } = weatherCodeToCondition(61)
    expect(label).toBe('Rain')
  })

  it('returns emoji for each condition', () => {
    expect(weatherCodeToCondition(0).emoji).toBeTruthy()
    expect(weatherCodeToCondition(95).emoji).toBeTruthy()
  })
})
