'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { CourseMap } from '@/components/CourseMap'
import { ElevationProfile } from '@/components/ElevationProfile'
import { AidStationTable } from '@/components/AidStationTable'
import { PaceInput } from '@/components/PaceInput'
import { WeatherTimeline } from '@/components/WeatherTimeline'
import { buttonVariants } from '@/lib/button-variants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { parseGPX } from '@/lib/gpx-parser'
import { alignWeatherToRace, type RaceWeatherEntry } from '@/lib/weather-timeline'
import { fetchForecast } from '@/lib/weather-client'
import type { TrackPoint, AidStation } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import type { Race } from '@/lib/db/races'
import type { SectionPlan } from '@/types/section'
import { PlanTab } from '@/components/PlanTab'

interface RaceData {
  race: Race
  aidStations: AidStation[]
  sectionPlans: SectionPlan[]
}

const KM_TO_MI = 0.621371

export default function RaceDetailPage({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = use(params)
  const [raceData, setRaceData] = useState<RaceData | null>(null)
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([])
  const [arrivalEstimates, setArrivalEstimates] = useState<ArrivalEstimate[]>([])
  const [weatherEntries, setWeatherEntries] = useState<RaceWeatherEntry[]>([])
  const [forecastAvailable, setForecastAvailable] = useState(true)
  const [forecastReason, setForecastReason] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/races/${raceId}`)
      .then((r) => r.json())
      .then(async (data: RaceData) => {
        setRaceData(data)

        // Parse GPX from stored data if available
        if (data.race.gpxData) {
          try {
            const { trackPoints: pts } = parseGPX(data.race.gpxData)
            setTrackPoints(pts)
          } catch {
            // GPX not available, map will show empty
          }
        }
      })
      .catch(() => setError('Failed to load race data'))
      .finally(() => setLoading(false))
  }, [raceId])

  useEffect(() => {
    if (!raceData || arrivalEstimates.length === 0 || trackPoints.length === 0) return

    const race = raceData.race
    const startLat = race.startLat ?? trackPoints[0]?.lat
    const startLon = race.startLon ?? trackPoints[0]?.lon

    if (!startLat || !startLon) return

    const raceDate = race.date
    const [year, month, day] = raceDate.split('-').map(Number)
    const lastArrival = arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival
    const endDate = lastArrival.toISOString().split('T')[0]

    fetchForecast(startLat, startLon, raceDate, endDate, race.timezone)
      .then((result) => {
        if (!result.available) {
          setForecastAvailable(false)
          setForecastReason(result.reason)
          return
        }
        const raceStart = new Date(`${raceDate}T${race.startTime}:00`)
        const aligned = alignWeatherToRace(result.forecasts, arrivalEstimates, trackPoints, raceStart)
        setWeatherEntries(aligned)
      })
      .catch(() => {
        // Weather fetch failed silently
      })
  }, [arrivalEstimates, raceData, trackPoints])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error || !raceData) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive">{error ?? 'Race not found'}</p>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { race, aidStations, sectionPlans } = raceData
  const raceStart = new Date(`${race.date}T${race.startTime}:00`)
  const totalKm = aidStations.length > 0
    ? aidStations[aidStations.length - 1].distanceFromStart
    : 0
  const totalMiles = (totalKm * KM_TO_MI).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:underline">Races</Link>
            <span>/</span>
            <span>{race.name}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{race.name}</h1>
          <p className="text-muted-foreground">
            {new Date(race.date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })} · Start {race.startTime} · {totalMiles} miles
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/${raceId}/setup`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Edit stations
          </Link>
        </div>
      </div>

      {/* Map */}
      <CourseMap
        trackPoints={trackPoints}
        aidStations={aidStations}
        className="h-80 w-full"
      />

      {/* Elevation Profile */}
      {trackPoints.length > 1 && (
        <ElevationProfile trackPoints={trackPoints} aidStations={aidStations} />
      )}

      {/* Pace Input */}
      <PaceInput
        aidStations={aidStations}
        raceStart={raceStart}
        totalDistanceKm={totalKm}
        onArrivalEstimatesChange={setArrivalEstimates}
      />

      {/* Aid Stations + Weather + Plan Tabs */}
      <Tabs defaultValue="stations">
        <TabsList>
          <TabsTrigger value="stations">Aid Stations</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="pt-4">
          <AidStationTable aidStations={aidStations} arrivalEstimates={arrivalEstimates} />
        </TabsContent>

        <TabsContent value="weather" className="pt-4">
          <WeatherTimeline
            entries={weatherEntries}
            forecastAvailable={forecastAvailable}
            unavailableReason={forecastReason}
          />
        </TabsContent>

        <TabsContent value="plan" className="pt-4">
          <PlanTab
            raceId={raceId}
            race={race}
            aidStations={aidStations}
            arrivalEstimates={arrivalEstimates}
            weatherEntries={weatherEntries}
            trackPoints={trackPoints}
            initialSectionPlans={sectionPlans}
            raceStart={raceStart}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
