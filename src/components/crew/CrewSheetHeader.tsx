import React from 'react'
import { PrintButton } from './PrintButton'

interface CrewSheetHeaderProps {
  raceName: string
  runnerName: string
  raceDate: string       // formatted date string
  totalMiles: string     // e.g. "100.0"
  publishedAt: string    // formatted published timestamp
  crewStationCount: number
  aidStationCount: number
  targetFinish: string | null
  estFinish: string | null
  transitToggle?: React.ReactNode  // optional transit mode toggle, rendered at bottom of header
  // Generic mode (PRD-031): time-free plan
  mode?: 'generic' | 'detailed'
  startTime?: string   // HH:MM
  timezone?: string    // IANA timezone
  date?: string        // YYYY-MM-DD (needed to format start time with tz abbr)
}

function formatStartTimeLine(date: string, time: string, timezone: string): string {
  if (!time) return ''
  try {
    const dt = new Date(`${date}T${time}:00`)
    return dt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
      timeZoneName: 'short',
    })
  } catch {
    return time
  }
}

export function CrewSheetHeader({
  raceName,
  runnerName,
  raceDate,
  totalMiles,
  publishedAt,
  crewStationCount,
  aidStationCount,
  targetFinish,
  estFinish,
  transitToggle,
  mode = 'detailed',
  startTime,
  timezone,
  date,
}: CrewSheetHeaderProps) {
  const isGeneric = mode === 'generic'

  const startTimeLine =
    isGeneric && startTime && timezone && date
      ? formatStartTimeLine(date, startTime, timezone)
      : null

  const stats: { val: string | number; lbl: string }[] = isGeneric
    ? [
        { val: crewStationCount, lbl: 'Crew stops' },
        { val: aidStationCount, lbl: 'Aid stations' },
      ]
    : [
        { val: crewStationCount, lbl: 'Crew stations' },
        { val: aidStationCount, lbl: 'Aid stations' },
        ...(targetFinish ? [{ val: targetFinish, lbl: 'Target finish' }] : []),
        ...(estFinish ? [{ val: estFinish, lbl: 'Est. finish' }] : []),
      ]

  const showStats = crewStationCount > 0 || aidStationCount > 0 || (!isGeneric && (targetFinish || estFinish))

  return (
    <>
      {/* Screen-only top bar */}
      <div
        className="print-hide"
        style={{
          background: '#02071E',
          borderBottom: '1px solid rgba(130,199,246,0.15)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontWeight: 800,
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '-0.02em',
          }}
        >
          PlanUltra
        </span>
        <PrintButton />
      </div>

      {/* Crew header */}
      <div
        className="crew-header"
        style={{
          background: '#02071E',
          padding: '32px 40px 28px',
          color: 'white',
        }}
      >
        <div className="crew-header-left">
          <p
            className="crew-hdr-racename"
            style={{
              fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'white',
              marginBottom: 6,
            }}
          >
            {raceName}
          </p>
          {!isGeneric && (
            <p
              className="crew-hdr-runner"
              style={{
                fontSize: 13,
                color: '#82C7F6',
                marginBottom: 4,
              }}
            >
              Crew sheet for {runnerName}
            </p>
          )}
          <p
            className="crew-hdr-meta"
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: isGeneric ? 4 : 12,
            }}
          >
            {raceDate} · {totalMiles} mi
          </p>
          {isGeneric && startTimeLine && (
            <p
              className="crew-hdr-meta"
              style={{
                fontSize: 12,
                color: '#82C7F6',
                marginBottom: 12,
              }}
            >
              Start {startTimeLine}
            </p>
          )}
          {!isGeneric && publishedAt && (
            <p
              className="crew-hdr-published"
              style={{
                fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              Published {publishedAt}
            </p>
          )}
        </div>

        {/* Stats row */}
        {showStats && (
          <div
            className="crew-header-right"
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid rgba(130,199,246,0.15)',
              flexWrap: 'wrap',
            }}
          >
            {stats.map(({ val, lbl }) => (
              <div key={lbl} className="header-stat" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  className="hstat-val"
                  style={{
                    fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#82C7F6',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {val}
                </span>
                <span
                  className="hstat-lbl"
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {lbl}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Transit mode toggle — only rendered when crew home base is set */}
        {transitToggle && (
          <div
            className="transit-toggle-wrapper"
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(130,199,246,0.15)',
            }}
          >
            {transitToggle}
          </div>
        )}
      </div>
    </>
  )
}
