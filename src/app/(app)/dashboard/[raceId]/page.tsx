'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timer, ClipboardList, Package, Users } from 'lucide-react'
import { CourseHeader } from '@/components/CourseHeader'
import { PaceTab } from '@/components/PaceTab'
import { PlanTab } from '@/components/PlanTab'
import { PackingPlan } from '@/components/PackingPlan'
import { CrewTab } from '@/components/CrewTab'
import { buttonVariants } from '@/lib/button-variants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { parseGPX } from '@/lib/gpx-parser'
import { alignWeatherToRace, type RaceWeatherEntry } from '@/lib/weather-timeline'
import { fetchForecast } from '@/lib/weather-client'
import { computeSections } from '@/lib/section-utils'
import type { TrackPoint, AidStation } from '@/types/gpx'
import { calculateArrivalTimes, type ArrivalEstimate } from '@/lib/pace-calculator'
import { isGuestMode, getGuestRaceById, getGuestAidStations, getGuestSections } from '@/lib/guest-storage'
import type { Race } from '@/lib/db/races'
import type { SectionPlan } from '@/types/section'

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
  const [weatherError, setWeatherError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionPlans, setSectionPlans] = useState<SectionPlan[]>([])
  const [caloriesPerHour, setCaloriesPerHour] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') ?? 'pace'

  const handleTabChange = (tab: string) => {
    router.replace(`?tab=${tab}`, { scroll: false })
  }

  const handleRaceUpdate = (updates: Partial<Race>) => {
    setRaceData((prev) => prev ? { ...prev, race: { ...prev.race, ...updates } } : prev)
  }

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return

    const loadRaceData = async (data: RaceData) => {
      setRaceData(data)
      setSectionPlans(data.sectionPlans)
      setCaloriesPerHour(data.race.caloriesPerHour ?? null)

      if (data.race.targetFinishMinutes && data.aidStations.length > 0) {
        const totalKm = data.aidStations[data.aidStations.length - 1].distanceFromStart
        const raceStart = new Date(`${data.race.date}T${data.race.startTime}:00`)
        setArrivalEstimates(
          calculateArrivalTimes(
            { mode: 'finish', targetMinutes: data.race.targetFinishMinutes, totalDistanceKm: totalKm },
            data.aidStations,
            raceStart
          )
        )
      }

      if (data.race.gpxData) {
        try {
          const { trackPoints: pts } = parseGPX(data.race.gpxData)
          setTrackPoints(pts)
        } catch {
          // GPX not available
        }
      }
    }

    if (isGuestMode()) {
      const race = getGuestRaceById(raceId)
      if (!race) {
        setError('Race not found')
        setLoading(false)
        return
      }
      const aidStations = getGuestAidStations(raceId)
      const sectionPlansData = getGuestSections(raceId)
      loadRaceData({ race, aidStations, sectionPlans: sectionPlansData }).finally(() =>
        setLoading(false)
      )
    } else {
      fetch(`/api/races/${raceId}`)
        .then((r) => r.json())
        .then((data: RaceData) => loadRaceData(data))
        .catch(() => setError('Failed to load race data'))
        .finally(() => setLoading(false))
    }
  }, [raceId, mounted])

  useEffect(() => {
    if (!raceData || arrivalEstimates.length === 0 || trackPoints.length === 0) return

    setWeatherError(false)
    const race = raceData.race
    const startLat = race.startLat ?? trackPoints[0]?.lat
    const startLon = race.startLon ?? trackPoints[0]?.lon

    if (!startLat || !startLon) return

    const raceDate = race.date
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
        setWeatherError(true)
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

  const { race, aidStations } = raceData
  const raceStart = new Date(`${race.date}T${race.startTime}:00`)
  const totalKm =
    aidStations.length > 0 ? aidStations[aidStations.length - 1].distanceFromStart : 0
  const totalMiles = (totalKm * KM_TO_MI).toFixed(1)

  const sections = computeSections(aidStations, arrivalEstimates, weatherEntries, trackPoints, raceStart)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="text-primary hover:underline">
              Races
            </Link>
            <span>/</span>
            <span>{race.name}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{race.name}</h1>
          <p className="text-muted-foreground">
            {new Date(race.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · Start {race.startTime} · {totalMiles} miles
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/${raceId}/setup`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Edit stations
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Course Header */}
        <CourseHeader race={race} trackPoints={trackPoints} aidStations={aidStations} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList variant="line" className="w-full h-11 rounded-none p-0 gap-0 border-b border-[rgba(130,199,246,0.55)]">
            <TabsTrigger
              value="pace"
              className="rounded-none border-b-2 border-b-transparent data-active:border-b-[#114574] data-active:font-semibold hover:bg-muted/20"
            >
              <Timer className="size-4" />
              <span className="max-[479px]:hidden">Pace</span>
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="rounded-none border-b-2 border-b-transparent data-active:border-b-[#114574] data-active:font-semibold hover:bg-muted/20"
            >
              <ClipboardList className="size-4" />
              <span className="max-[479px]:hidden">Plan</span>
            </TabsTrigger>
            <TabsTrigger
              value="pack"
              className="rounded-none border-b-2 border-b-transparent data-active:border-b-[#114574] data-active:font-semibold hover:bg-muted/20"
            >
              <Package className="size-4" />
              <span className="max-[479px]:hidden">Pack</span>
            </TabsTrigger>
            <TabsTrigger
              value="crew"
              className="rounded-none border-b-2 border-b-transparent data-active:border-b-[#114574] data-active:font-semibold hover:bg-muted/20"
            >
              <Users className="size-4" />
              <span className="max-[479px]:hidden">Crew</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pace" className="pt-4" keepMounted>
            <PaceTab
              race={race}
              aidStations={aidStations}
              raceStart={raceStart}
              onArrivalEstimatesChange={setArrivalEstimates}
            />
          </TabsContent>

          <TabsContent value="plan" className="pt-4">
            {weatherError && (
              <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
                Could not load weather forecast. Check your network connection.
              </div>
            )}
            <PlanTab
              raceId={raceId}
              race={race}
              aidStations={aidStations}
              arrivalEstimates={arrivalEstimates}
              weatherEntries={weatherEntries}
              trackPoints={trackPoints}
              initialSectionPlans={sectionPlans}
              raceStart={raceStart}
              onSectionPlansChange={setSectionPlans}
              onCaloriesPerHourChange={setCaloriesPerHour}
              isGuest={mounted && isGuestMode()}
            />
          </TabsContent>

          <TabsContent value="pack" className="pt-4">
            <PackingPlan
              sections={sections}
              sectionPlans={sectionPlans}
              caloriesPerHour={caloriesPerHour}
              arrivalEstimates={arrivalEstimates}
            />
          </TabsContent>

          <TabsContent value="crew" className="pt-4">
            <CrewTab race={race} onRaceUpdate={handleRaceUpdate} isGuest={mounted && isGuestMode()} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
