import QRCode from 'qrcode'
import { getStationVisitInfo } from '@/lib/utils/station-display'
import { getRaceByCrewToken } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { getSectionPlans } from '@/lib/db/sections'
import { calculateArrivalTimes, type PaceConfig } from '@/lib/pace-calculator'
import { computeSections } from '@/lib/section-utils'
import { parseGPX } from '@/lib/gpx-parser'
import { fetchForecast } from '@/lib/weather-client'
import { alignWeatherToRace, type RaceWeatherEntry } from '@/lib/weather-timeline'
import { getDriveSegment, type DriveSegment } from '@/lib/maps'
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
  const visitInfo = getStationVisitInfo(sortedStations)
  const visitInfoMap = new Map(sortedStations.map((s, i) => [s.order, visitInfo[i]]))

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

  // Fetch drive segments between adjacent crew stations with coords
  const crewStationsWithCoords = sortedStations.filter(
    (s) => (s.hasCrewAccess || s.isFinish) && s.crewParkingCoords
  )
  const driveSegmentMap = new Map<number, DriveSegment | null>()
  if (crewStationsWithCoords.length >= 2) {
    const driveResults = await Promise.all(
      crewStationsWithCoords.slice(0, -1).map((s, i) =>
        getDriveSegment(s.crewParkingCoords!, crewStationsWithCoords[i + 1].crewParkingCoords!)
      )
    )
    crewStationsWithCoords.slice(0, -1).forEach((s, i) => {
      driveSegmentMap.set(s.order, driveResults[i])
    })
  }

  // Fetch base-to-station drive segments when crew home base is set
  const homeBase = race.crewHomeBase ?? null
  const baseToStationMap = new Map<number, DriveSegment | null>()
  if (homeBase && crewStationsWithCoords.length > 0) {
    const b2sResults = await Promise.all(
      crewStationsWithCoords.map((s) =>
        getDriveSegment(homeBase, s.crewParkingCoords!)
      )
    )
    crewStationsWithCoords.forEach((s, i) => {
      baseToStationMap.set(s.order, b2sResults[i])
    })
  }

  // Generate QR SVGs for crew stations with parking coords
  const qrSvgMap = new Map<number, string>()
  await Promise.all(
    sortedStations
      .filter((s) => (s.hasCrewAccess || s.isFinish) && s.crewParkingCoords)
      .map(async (s) => {
        const mapsUrl = `https://maps.google.com/?q=${s.crewParkingCoords!.lat},${s.crewParkingCoords!.lng}`
        try {
          const svg = await QRCode.toString(mapsUrl, {
            type: 'svg',
            color: { dark: '#114574', light: '#ffffff' },
            margin: 1,
            width: 72,
          })
          qrSvgMap.set(s.order, svg)
        } catch {
          // QR generation failed — omit QR for this station
        }
      })
  )

  // Build render items: crew/finish stations with bridge groups between them
  type BridgeItem = {
    type: 'bridge'
    nonCrewStations: AidStation[]
    destStation: AidStation
    driveSegment: DriveSegment | null
    baseToStation: DriveSegment | null
  }
  type StationItem = { type: 'station'; station: AidStation }
  type RenderItem = StationItem | BridgeItem

  const renderItems: RenderItem[] = []
  let pendingNonCrew: AidStation[] = []
  let prevCrewStation: AidStation | null = null

  for (const station of sortedStations) {
    const isCrewOrFinish = station.hasCrewAccess || station.isFinish
    if (isCrewOrFinish) {
      if (prevCrewStation !== null || pendingNonCrew.length > 0) {
        // Emit bridge before this crew station
        const originStation = prevCrewStation
        const driveKey = originStation?.order ?? -1
        const seg = driveSegmentMap.get(driveKey) ?? null
        // Only emit bridge if there were non-crew stations between OR there's a prev crew station
        if (pendingNonCrew.length > 0 || prevCrewStation !== null) {
          renderItems.push({
            type: 'bridge',
            nonCrewStations: pendingNonCrew,
            destStation: station,
            driveSegment: seg,
            baseToStation: baseToStationMap.get(station.order) ?? null,
          })
        }
        pendingNonCrew = []
      }
      renderItems.push({ type: 'station', station })
      prevCrewStation = station
    } else {
      // First station (start) is typically crew — but if not, still handle
      if (prevCrewStation === null && renderItems.length === 0) {
        renderItems.push({ type: 'station', station })
      } else {
        pendingNonCrew.push(station)
      }
    }
  }

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

  const transitToggleNode = homeBase ? (
    <div
      id="transit-toggle"
      data-current-mode="s2s"
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      <span style={{
        fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
      }}>
        Drive times:
      </span>
      <button
        data-toggle-target="s2s"
        className="toggle-btn toggle-selected"
        style={{
          fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
          fontSize: 13,
          padding: '4px 12px',
          borderRadius: 20,
          border: '1px solid rgba(130,199,246,0.4)',
          cursor: 'pointer',
        }}
      >
        Station → Station
      </button>
      <button
        data-toggle-target="b2s"
        className="toggle-btn"
        style={{
          fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
          fontSize: 13,
          padding: '4px 12px',
          borderRadius: 20,
          border: '1px solid rgba(130,199,246,0.4)',
          cursor: 'pointer',
        }}
      >
        Base → Station
      </button>
    </div>
  ) : null

  return (
    <>
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white; }
          .crew-header { background: #1D7CBE !important; }
          .station-card { break-inside: avoid; page-break-inside: avoid; }
          .segment-bridge { break-inside: avoid; page-break-inside: avoid; }
          .station-card--crew {
            background: white !important;
            border-left: 4px solid #1D7CBE !important;
          }
          .condition-chip { border: 1px solid #114574 !important; background: white !important; }
          .timeline-dot-inner { background: #1D7CBE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          a { text-decoration: none !important; color: inherit !important; }
          /* Maps link: show URL as text on print */
          .maps-link::after {
            content: " — maps.google.com/?q=" attr(data-lat) "," attr(data-lng);
            font-size: 9px;
            color: #114574;
            font-weight: 400;
          }
          .maps-link {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            color: #1D7CBE !important;
            font-size: 10px !important;
          }
          /* QR frame */
          .qr-frame { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Location strip */
          .location-strip { background: #f0f9ff !important; border-bottom: 1px solid #82C7F6 !important; border-right-color: #82C7F6 !important; }
          /* QR sidebar — preserve grid on print, high-contrast colours */
          .station-card-top { display: grid !important; grid-template-columns: 1fr auto !important; }
          .qr-sidebar { background: #f0f9ff !important; border-left-color: #82C7F6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Bridge */
          .bridge-drive-panel { background: #e8f4fb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .segment-bridge { border: 1px solid #82C7F6 !important; }
          /* High contrast overrides */
          .parking-badge { background: #e8f4fb !important; border-color: #82C7F6 !important; color: #114574 !important; }
          /* Hide transit toggle on print — always show s2s times */
          .transit-toggle-wrapper { display: none !important; }
        }
        .toggle-btn { background: transparent; color: rgba(255,255,255,0.6); }
        .toggle-btn.toggle-selected { background: #1D7CBE; color: white; border-color: #1D7CBE !important; }
        @media (max-width: 639px) {
          .stn-hdr { flex-wrap: wrap !important; gap: 4px 8px !important; align-items: center !important; }
          .stn-name { order: 1; width: 100%; flex: none !important; font-size: 16px !important; white-space: normal !important; overflow: visible !important; margin-bottom: 2px; }
          .stn-mile { order: 2; }
          .stn-right { order: 3; margin-left: auto; }
          /* Location strip: shrink QR sidebar at narrow widths, keep grid */
          .qr-sidebar { padding: 8px 10px !important; }
          .qr-frame { width: 60px !important; height: 60px !important; }
          .qr-caption { font-size: 7px !important; width: 60px !important; }
          .location-strip { padding: 8px 0 9px 12px !important; }
          /* Bridge: stack on mobile */
          .bridge-inner { flex-direction: column !important; }
          .bridge-drive-panel { border-right: none !important; border-bottom: 1px solid rgba(130,199,246,0.25) !important; min-width: unset !important; }
        }
        /* At very narrow widths: hide QR sidebar so content fills full width.
           Scoped to screen so print still shows the QR. */
        @media screen and (max-width: 400px) {
          .qr-sidebar { display: none !important; }
          .station-card-top { grid-template-columns: 1fr !important; }
          .station-card-left > div:first-child { border-right: none !important; }
          .location-strip { border-right: none !important; }
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
          transitToggle={transitToggleNode}
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
          <div style={{ position: 'relative', padding: '32px 20px 40px' }}>
            {/* Continuous timeline line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 42,
                top: 32,
                bottom: 40,
                width: 2,
                background:
                  'linear-gradient(to bottom, rgba(130,199,246,0.15) 0%, rgba(130,199,246,0.55) 8%, rgba(130,199,246,0.55) 92%, rgba(130,199,246,0.15) 100%)',
              }}
            />

            {renderItems.map((item, idx) => {
              const isLast = idx === renderItems.length - 1

              if (item.type === 'bridge') {
                const { nonCrewStations, destStation, driveSegment, baseToStation } = item
                return (
                  <div key={`bridge-${destStation.order}`}>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '44px 1fr', alignItems: 'stretch' }}
                    >
                      {/* Gutter — no dot, line passes through */}
                      <div style={{ minHeight: 48 }} />
                      {/* Bridge block */}
                      <div
                        className="segment-bridge"
                        {...(homeBase ? {
                          'data-s2s-time': driveSegment?.durationText ?? '',
                          'data-s2s-dist': driveSegment?.distanceText ?? '',
                          'data-b2s-time': baseToStation?.durationText ?? '',
                          'data-b2s-dist': baseToStation?.distanceText ?? '',
                          'data-base-label': homeBase.label || 'Home base',
                          'data-dest-label': destStation.name,
                        } : {})}
                        style={{
                          display: 'flex',
                          border: '1px solid rgba(130,199,246,0.28)',
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: '#f7fafd',
                          margin: '2px 0',
                        }}
                      >
                        <div
                          className="bridge-inner"
                          style={{ display: 'flex', flex: 1 }}
                        >
                          {/* Left: drive info */}
                          <div
                            className="bridge-drive-panel"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              gap: 2,
                              padding: '10px 14px',
                              minWidth: 152,
                              flexShrink: 0,
                              borderRight: '1px solid rgba(130,199,246,0.25)',
                              background: 'rgba(219,241,250,0.3)',
                            }}
                          >
                            <div className="bridge-label" style={{
                              fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                              color: 'rgba(17,69,116,0.45)', marginBottom: 1,
                            }}>
                              🚗 Drive to
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
                              fontSize: 12, fontWeight: 700, color: '#114574',
                            }}>
                              {visitInfoMap.get(destStation.order)?.displayName ?? destStation.name}
                            </div>
                            <div className="bridge-duration" style={{
                              fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
                              fontSize: 15, fontWeight: 800, color: '#1D7CBE',
                              letterSpacing: '-0.02em', marginTop: 1,
                            }}>
                              {driveSegment ? driveSegment.durationText : '—'}
                            </div>
                            <div className="bridge-distance" style={{
                              fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                              fontSize: 10, color: 'rgba(17,69,116,0.45)',
                            }}>
                              {driveSegment ? driveSegment.distanceText : ''}
                            </div>
                            {homeBase && (
                              <div
                                className="bridge-sublabel"
                                style={{
                                  fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                                  fontSize: 9, color: 'rgba(17,69,116,0.38)',
                                  letterSpacing: '0.05em', marginTop: 1,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                              >
                                Station → Station
                              </div>
                            )}
                          </div>

                          {/* Right: runner checkpoints */}
                          <div style={{
                            flex: 1, padding: '10px 14px',
                            display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center',
                          }}>
                            <div style={{
                              fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                              color: 'rgba(17,69,116,0.38)', marginBottom: 2,
                            }}>
                              Runner checkpoints
                            </div>
                            {nonCrewStations.length === 0 ? (
                              <div style={{
                                fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                                fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                                color: 'rgba(17,69,116,0.35)', fontStyle: 'italic',
                              }}>
                                No intermediate checkpoints
                              </div>
                            ) : (
                              nonCrewStations.map((cp) => {
                                const cpMile = (cp.distanceFromStart * KM_TO_MI).toFixed(1)
                                const cpArrival = arrivalMap.get(cp.order)?.estimatedArrival ?? null
                                return (
                                  <div key={cp.order} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                      width: 5, height: 5, borderRadius: '50%',
                                      background: 'rgba(130,199,246,0.6)',
                                      border: '1px solid rgba(130,199,246,0.9)',
                                      flexShrink: 0,
                                    }} />
                                    <span style={{
                                      fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                                      fontSize: 10, color: '#02071E',
                                      background: 'rgba(219,241,250,0.7)',
                                      border: '1px solid rgba(130,199,246,0.4)',
                                      borderRadius: 4, padding: '1px 6px',
                                      whiteSpace: 'nowrap' as const, flexShrink: 0,
                                    }}>
                                      MI {cpMile}
                                    </span>
                                    <span style={{
                                      fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                                      fontSize: 11, fontWeight: 600,
                                      color: 'rgba(17,69,116,0.65)', flex: 1,
                                    }}>
                                      {cp.name}
                                    </span>
                                    {cpArrival && (
                                      <span style={{
                                        fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                                        fontSize: 10, color: 'rgba(29,124,190,0.6)',
                                        whiteSpace: 'nowrap' as const,
                                      }}>
                                        {cpArrival.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isLast && (
                      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', height: 16 }} />
                    )}
                  </div>
                )
              }

              // Station item
              const station = item.station
              const isFinish = !!station.isFinish
              const isCrewAccess = station.hasCrewAccess || isFinish
              const arrivalEst = arrivalMap.get(station.order)
              const arrivalTime = arrivalEst?.estimatedArrival ?? null
              const sectionPlan = sectionPlanMap.get(station.order) ?? null
              const section = sectionMap.get(station.order) ?? null

              const dotStyle: React.CSSProperties = isFinish
                ? {
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#02071E', border: '2px solid #82C7F6',
                    boxShadow: '0 0 0 3px rgba(130,199,246,0.2)', flexShrink: 0,
                  }
                : isCrewAccess
                  ? {
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#1D7CBE', border: '2px solid #1D7CBE',
                      boxShadow: '0 0 0 3px rgba(29,124,190,0.18)', flexShrink: 0,
                    }
                  : {
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'white', border: '2px solid #82C7F6', flexShrink: 0,
                    }

              return (
                <div key={station.order}>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', alignItems: 'flex-start' }}>
                    {/* Dot */}
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 18, position: 'relative', zIndex: 1 }}>
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
                      qrSvg={qrSvgMap.get(station.order) ?? null}
                      visitIndex={visitInfoMap.get(station.order)?.visitIndex ?? 1}
                      visitTotal={visitInfoMap.get(station.order)?.visitTotal ?? 1}
                    />
                  </div>
                  {!isLast && (
                    <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', height: 16 }} />
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

      {homeBase && (
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var toggle = document.getElementById('transit-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-toggle-target]');
    if (!btn) return;
    var mode = btn.dataset.toggleTarget;
    toggle.dataset.currentMode = mode;
    toggle.querySelectorAll('[data-toggle-target]').forEach(function(b) {
      b.classList.toggle('toggle-selected', b.dataset.toggleTarget === mode);
    });
    document.querySelectorAll('.segment-bridge[data-s2s-time]').forEach(function(bridge) {
      var labelEl = bridge.querySelector('.bridge-label');
      var durEl = bridge.querySelector('.bridge-duration');
      var distEl = bridge.querySelector('.bridge-distance');
      var subEl = bridge.querySelector('.bridge-sublabel');
      if (mode === 's2s') {
        if (labelEl) labelEl.textContent = '\uD83D\uDE97 Drive to';
        if (durEl) durEl.textContent = bridge.dataset.s2sTime || '\u2014';
        if (distEl) distEl.textContent = bridge.dataset.s2sDist || '';
        if (subEl) subEl.textContent = 'Station \u2192 Station';
      } else {
        if (labelEl) labelEl.textContent = '\uD83D\uDE97 From base';
        if (durEl) durEl.textContent = bridge.dataset.b2sTime || '\u2014';
        if (distEl) distEl.textContent = bridge.dataset.b2sDist || '';
        if (subEl) {
          subEl.textContent = bridge.dataset.b2sTime
            ? (bridge.dataset.baseLabel + ' \u2192 ' + bridge.dataset.destLabel)
            : 'Route unavailable';
        }
      }
    });
  });
})();
        ` }} />
      )}
    </>
  )
}
