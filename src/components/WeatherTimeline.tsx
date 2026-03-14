'use client'

import type { RaceWeatherEntry } from '@/lib/weather-timeline'
import { weatherCodeToCondition } from '@/lib/weather-client'

interface WeatherTimelineProps {
  entries: RaceWeatherEntry[]
  forecastAvailable?: boolean
  unavailableReason?: string
}

function formatHour(isoTime: string): string {
  const date = new Date(isoTime)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  })
}

function formatElapsed(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `+${h}h${m}m` : `+${h}h`
}

export function WeatherTimeline({
  entries,
  forecastAvailable = true,
  unavailableReason,
}: WeatherTimelineProps) {
  if (!forecastAvailable) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {unavailableReason ?? 'Forecast not yet available'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Weather forecasts are available up to 16 days before the race.
        </p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Set your pace to see the weather forecast aligned to your race timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
        {entries.map((entry, i) => {
          const { label, emoji } = weatherCodeToCondition(entry.weatherCode)
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 min-w-[80px] ${
                entry.isNight ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-background'
              }`}
            >
              <span className="text-xs text-muted-foreground font-medium">
                {formatHour(entry.hour)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatElapsed(entry.elapsedHours)}
              </span>
              <span className="text-2xl" role="img" aria-label={label}>
                {entry.isNight && entry.weatherCode === 0 ? '🌙' : emoji}
              </span>
              <span className="text-sm font-semibold">
                {Math.round(entry.temperature)}°
              </span>
              <div className="flex flex-col items-center gap-0.5">
                {entry.precipitationProbability > 0 && (
                  <span className="text-xs text-blue-500">
                    {entry.precipitationProbability}%
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {Math.round(entry.windSpeed)}mph
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
