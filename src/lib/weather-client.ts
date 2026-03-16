export interface HourlyForecast {
  time: string   // ISO 8601
  temperature: number
  precipitationProbability: number
  windSpeed: number
  weatherCode: number
  isNight: boolean
}

export interface ForecastResult {
  available: boolean
  forecasts: HourlyForecast[]
  reason?: string
}

const FORECAST_HORIZON_DAYS = 16

export async function fetchForecast(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  timezone: string
): Promise<ForecastResult> {
  const start = new Date(startDate)
  const now = new Date()
  const daysUntilRace = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (daysUntilRace > FORECAST_HORIZON_DAYS) {
    return {
      available: false,
      forecasts: [],
      reason: `Forecast available within ${FORECAST_HORIZON_DAYS} days of race date`,
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toFixed(4))
  url.searchParams.set('longitude', lon.toFixed(4))
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,wind_speed_10m,weather_code,is_day')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('wind_speed_unit', 'mph')
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('timezone', timezone)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as OpenMeteoResponse

  const hourly = data.hourly
  const forecasts: HourlyForecast[] = hourly.time.map((time, i) => ({
    time,
    temperature: hourly.temperature_2m[i],
    precipitationProbability: hourly.precipitation_probability[i],
    windSpeed: hourly.wind_speed_10m[i],
    weatherCode: hourly.weather_code[i],
    isNight: hourly.is_day[i] === 0,
  }))

  return { available: true, forecasts }
}

interface OpenMeteoResponse {
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
    wind_speed_10m: number[]
    weather_code: number[]
    is_day: number[]
  }
}

export function weatherCodeToCondition(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear', emoji: '☀️' }
  if (code <= 2) return { label: 'Partly cloudy', emoji: '⛅' }
  if (code === 3) return { label: 'Overcast', emoji: '☁️' }
  if (code <= 49) return { label: 'Foggy', emoji: '🌫️' }
  if (code <= 59) return { label: 'Drizzle', emoji: '🌦️' }
  if (code <= 69) return { label: 'Rain', emoji: '🌧️' }
  if (code <= 79) return { label: 'Snow', emoji: '❄️' }
  if (code <= 84) return { label: 'Rain showers', emoji: '🌧️' }
  if (code <= 94) return { label: 'Thunderstorms', emoji: '⛈️' }
  return { label: 'Severe storms', emoji: '🌩️' }
}
