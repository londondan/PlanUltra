import { getRaceByCrewToken } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { getSectionPlans } from '@/lib/db/sections'
import { calculateArrivalTimes, type PaceConfig } from '@/lib/pace-calculator'
import { computeSections } from '@/lib/section-utils'
import { parseGPX } from '@/lib/gpx-parser'
import { fetchForecast } from '@/lib/weather-client'
import { alignWeatherToRace, type RaceWeatherEntry } from '@/lib/weather-timeline'
import { CrewSheetHeader } from '@/components/crew/CrewSheetHeader'
import { CrewStationCard } from '@/components/crew/CrewStationCard'
import type { Race } from '@/lib/db/races'
import type { AidStation } from '@/types/gpx'
import type { Section, SectionPlan } from '@/types/section'
import type { ArrivalEstimate } from '@/lib/pace-calculator'
import Link from 'next/link'

const KM_TO_MI = 0.621371

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPaceConfig(race: Race, totalDistanceKm: number): PaceConfig | null {
  if (race.paceMode === 'pace' && race.paceMin) {
    const minutesPerMile = parseInt(race.paceMin, 10) + parseInt(race.paceSec || '0', 10) / 60
    if (minutesPerMile > 0) return { mode: 'pace', minutesPerMile }
  } else if (race.paceMode === 'finish') {
    const totalMinutes =
      parseInt(race.finishHours || '0', 10) * 60 + parseInt(race.finishMins || '0', 10)
    if (totalMinutes > 0) return { mode: 'finish', targetMinutes: totalMinutes, totalDistanceKm }
  } else if (race.targetFinishMinutes && race.targetFinishMinutes > 0) {
    return { mode: 'finish', targetMinutes: race.targetFinishMinutes, totalDistanceKm }
  }
  return null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatPublishedAt(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Not-found variants ──────────────────────────────────────────────────────

const NOT_FOUND_VARIANTS = [
  {
    headline: 'Looks like this crew sheet got lost somewhere out on the course.',
    subtext: 'It may have been unpublished, or the link may have changed.',
  },
  {
    headline: 'Your crew sheet may have gotten lost between miles 44 and 62.',
    subtext: 'Classic. The link may have been unpublished or regenerated.',
  },
  {
    headline: 'This link has gone dark — like mile 80 with a dying headlamp.',
    subtext: 'The runner may have unpublished this plan or reshared a new link.',
  },
  {
    headline: 'Aid station closed. Nothing to see here.',
    subtext: 'This crew sheet link is no longer active.',
  },
]

function NotFoundPage({ token }: { token: string }) {
  const variant = parseInt(token.slice(-2), 36) % 4
  const { headline, subtext } = NOT_FOUND_VARIANTS[variant]

  return (
    <>
      <style>{`
        body { background: white; margin: 0; }
      `}</style>

      {/* Minimal header */}
      <div style={{ background: '#02071E', padding: '16px 24px' }}>
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontWeight: 800,
            fontSize: 16,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '-0.02em',
          }}
        >
          PlanUltra
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '64px 24px 48px',
          textAlign: 'center',
        }}
      >
        {/* Mountain SVG illustration */}
        <div style={{ marginBottom: 40, opacity: 0.4 }}>
          <svg
            width="200"
            height="100"
            viewBox="0 0 200 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <polygon points="20,95 75,18 130,95" fill="#82C7F6" />
            <polygon points="65,95 115,42 165,95" fill="#DBF1FA" />
            <polygon points="100,95 145,58 190,95" fill="#82C7F6" opacity="0.6" />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 800,
            color: '#02071E',
            lineHeight: 1.25,
            marginBottom: 16,
          }}
        >
          {headline}
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
            fontSize: 15,
            color: 'rgba(17,69,116,0.7)',
            marginBottom: 40,
          }}
        >
          {subtext}
        </p>

        {/* What to try */}
        <div style={{ textAlign: 'left', display: 'inline-block', maxWidth: 420 }}>
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(17,69,116,0.5)',
              marginBottom: 10,
            }}
          >
            What to try
          </p>
          <ul
            style={{
              paddingLeft: 20,
              margin: 0,
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 14,
              color: '#02071E',
              lineHeight: 1.7,
            }}
          >
            <li>Ask your runner to re-share the link</li>
            <li>
              If you&apos;re the runner, check the Crew tab in your plan to get the current link
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 40 }}>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              border: '1px solid #1D7CBE',
              color: '#1D7CBE',
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              padding: '9px 20px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Sign in to PlanUltra
          </Link>
          <p
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 12,
              color: 'rgba(17,69,116,0.4)',
            }}
          >
            For runners only — crew members don&apos;t need to sign in
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default async function CrewSheetPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const race = await getRaceByCrewToken(token)

  if (!race) {
    return <NotFoundPage token={token} />
  }

  // Fetch aid stations and section plans
  const [aidStations, sectionPlans] = await Promise.all([
    getAidStations(race.raceId),
    getSectionPlans(race.raceId),
  ])

  const sortedStations = [...aidStations].sort((a, b) => a.order - b.order)
  const totalDistanceKm =
    sortedStations.length > 0
      ? sortedStations[sortedStations.length - 1].distanceFromStart
      : 0
  const totalMiles = (totalDistanceKm * KM_TO_MI).toFixed(1)

  const raceStart = new Date(`${race.date}T${race.startTime}:00`)

  // Calculate arrival times
  let arrivalEstimates: ArrivalEstimate[] = []
  const paceConfig = buildPaceConfig(race, totalDistanceKm)
  if (paceConfig && sortedStations.length > 0) {
    arrivalEstimates = calculateArrivalTimes(paceConfig, sortedStations, raceStart)
  }

  // Parse GPX
  let trackPoints: import('@/types/gpx').TrackPoint[] = []
  if (race.gpxData) {
    try {
      const parsed = parseGPX(race.gpxData)
      trackPoints = parsed.trackPoints
    } catch {
      // GPX parse failed — proceed without elevation/track data
    }
  }

  // Fetch weather (best-effort; past races will fail)
  let weatherEntries: RaceWeatherEntry[] = []
  if (race.startLat && race.startLon && arrivalEstimates.length > 0 && trackPoints.length > 0) {
    try {
      const lastArrival = arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival
      const endDate = lastArrival.toISOString().split('T')[0]
      const result = await fetchForecast(
        race.startLat,
        race.startLon,
        race.date,
        endDate,
        race.timezone
      )
      if (result.available) {
        weatherEntries = alignWeatherToRace(result.forecasts, arrivalEstimates, trackPoints, raceStart)
      }
    } catch {
      // Weather unavailable — proceed without it
    }
  }

  // Compute sections (between drop-bag boundaries)
  const sections = computeSections(sortedStations, arrivalEstimates, weatherEntries, trackPoints, raceStart)

  // Build lookup maps
  const arrivalMap = new Map<number, ArrivalEstimate>(
    arrivalEstimates.map((e) => [e.order, e])
  )
  const sectionPlanMap = new Map<number, SectionPlan>(
    sectionPlans.map((p) => [p.fromStationOrder, p])
  )
  const sectionMap = new Map<number, Section>(
    sections.map((s) => [s.fromStation.order, s])
  )

  const raceLat = race.startLat ?? null
  const raceLon = race.startLon ?? null

  const raceDate = formatDate(race.date)
  const publishedAt = race.crewPublishedAt ? formatPublishedAt(race.crewPublishedAt) : ''
  const runnerName = race.runnerName || 'your runner'

  // Header stats
  const crewStationCount = sortedStations.filter((s) => s.hasCrewAccess && !s.isFinish).length
  const aidStationCount = sortedStations.length
  const targetFinish = (() => {
    const mins =
      parseInt(race.finishHours || '0', 10) * 60 + parseInt(race.finishMins || '0', 10)
    if (race.paceMode === 'finish' && mins > 0) {
      const h = Math.floor(mins / 60), m = mins % 60
      return m > 0 ? `~${h}h ${m}m` : `~${h}h`
    }
    if (race.targetFinishMinutes) {
      const h = Math.floor(race.targetFinishMinutes / 60), m = race.targetFinishMinutes % 60
      return m > 0 ? `~${h}h ${m}m` : `~${h}h`
    }
    return null
  })()
  const estFinish =
    arrivalEstimates.length > 0
      ? formatTime(arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival)
      : null

  return (
    <>
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white; }
          .crew-header { background: #1D7CBE !important; }
          .station-card { break-inside: avoid; page-break-inside: avoid; }
          .station-card--crew {
            background: white !important;
            border-left: 4px solid #1D7CBE !important;
          }
          .condition-chip { border: 1px solid #114574 !important; background: white !important; }
          .timeline-dot-inner { background: #1D7CBE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          a { text-decoration: none !important; color: inherit !important; }
        }
      `}</style>

      {/* Page wrapper */}
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          background: 'white',
          minHeight: '100vh',
        }}
      >
        <CrewSheetHeader
          raceName={race.name}
          runnerName={runnerName}
          raceDate={raceDate}
          totalMiles={totalMiles}
          publishedAt={publishedAt}
          crewStationCount={crewStationCount}
          aidStationCount={aidStationCount}
          targetFinish={targetFinish}
          estFinish={estFinish}
        />

        {/* Station list */}
        {sortedStations.length === 0 ? (
          <div style={{ padding: '32px 24px' }}>
            <p
              style={{
                fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                color: 'rgba(17,69,116,0.5)',
                textAlign: 'center',
                padding: '40px 0',
              }}
            >
              No aid stations have been added to this plan yet.
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative', padding: '32px 40px 40px' }}>
            {/* Continuous timeline line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 62,
                top: 32,
                bottom: 40,
                width: 2,
                background:
                  'linear-gradient(to bottom, rgba(130,199,246,0.15) 0%, rgba(130,199,246,0.55) 8%, rgba(130,199,246,0.55) 92%, rgba(130,199,246,0.15) 100%)',
              }}
            />

            {sortedStations.map((station, idx) => {
              const isFinish = !!station.isFinish
              const isLast = idx === sortedStations.length - 1
              const isCrewAccess = station.hasCrewAccess || isFinish
              const arrivalEst = arrivalMap.get(station.order)
              const arrivalTime = arrivalEst?.estimatedArrival ?? null
              const sectionPlan = sectionPlanMap.get(station.order) ?? null
              const section = sectionMap.get(station.order) ?? null

              const dotStyle: React.CSSProperties = isFinish
                ? {
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#02071E',
                    border: '2px solid #82C7F6',
                    boxShadow: '0 0 0 3px rgba(130,199,246,0.2)',
                    flexShrink: 0,
                  }
                : isCrewAccess
                  ? {
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#1D7CBE',
                      border: '2px solid #1D7CBE',
                      boxShadow: '0 0 0 3px rgba(29,124,190,0.18)',
                      flexShrink: 0,
                    }
                  : {
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'white',
                      border: '2px solid #82C7F6',
                      flexShrink: 0,
                    }

              return (
                <div key={station.order}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: 18,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <div className="timeline-dot-inner" style={dotStyle} />
                    </div>
                    {/* Card */}
                    <CrewStationCard
                      station={station}
                      arrivalTime={arrivalTime}
                      sectionPlan={sectionPlan}
                      section={section}
                      raceLat={raceLat}
                      raceLon={raceLon}
                      caloriesPerHour={race.caloriesPerHour ?? null}
                      isFinish={isFinish}
                    />
                  </div>
                  {/* Gap between rows */}
                  {!isLast && (
                    <div
                      aria-hidden="true"
                      style={{ display: 'grid', gridTemplateColumns: '44px 1fr', height: 16 }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid rgba(130,199,246,0.2)',
            padding: '20px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 12,
              color: 'rgba(17,69,116,0.4)',
              marginBottom: 4,
            }}
          >
            Generated by PlanUltra
          </p>
          {publishedAt && (
            <p
              style={{
                fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                fontSize: 11,
                color: 'rgba(17,69,116,0.3)',
                marginBottom: 8,
              }}
            >
              {publishedAt}
            </p>
          )}
          <a
            href="https://www.planultrarace.com"
            className="print-hide"
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 12,
              color: '#1D7CBE',
            }}
          >
            www.planultrarace.com
          </a>
        </div>
      </div>
    </>
  )
}
