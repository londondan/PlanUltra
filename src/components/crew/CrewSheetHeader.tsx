import { PrintButton } from './PrintButton'

interface CrewSheetHeaderProps {
  raceName: string
  runnerName: string
  raceDate: string       // formatted date string
  totalMiles: string     // e.g. "100.0"
  publishedAt: string    // formatted published timestamp
}

export function CrewSheetHeader({
  raceName,
  runnerName,
  raceDate,
  totalMiles,
  publishedAt,
}: CrewSheetHeaderProps) {
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
        <p
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
        <p
          style={{
            fontSize: 13,
            color: '#82C7F6',
            marginBottom: 4,
          }}
        >
          Crew sheet for {runnerName}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 12,
          }}
        >
          {raceDate} · {totalMiles} mi
        </p>
        <p
          style={{
            fontFamily: 'var(--font-geist-mono), Courier New, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.28)',
          }}
        >
          Published {publishedAt}
        </p>
      </div>
    </>
  )
}
