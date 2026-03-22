'use client'

import { useRef, useEffect, useState } from 'react'
import type { RaceWeatherEntry } from '@/lib/weather-timeline'
import type { AidStation } from '@/types/gpx'
import type { ArrivalEstimate } from '@/lib/pace-calculator'

interface WeatherTimelineProps {
  entries: RaceWeatherEntry[]
  aidStations: AidStation[]
  arrivalEstimates: ArrivalEstimate[]
  raceStart: Date
  totalDistanceMiles: number
  forecastAvailable?: boolean
  unavailableReason?: string
}

// Design system tokens (PRD-003)
const C = {
  ridgeBlue: '#1D7CBE',
  deepRidge: '#114574',
  sky: '#82C7F6',
  midnight: '#02071E',
}

// Chart layout (Section 11.8)
const ML = 36   // left margin — y-axis labels
const MR = 16   // right margin
const MT = 12   // top margin
const MB = 8    // bottom margin
const CHART_H = 130    // total chart area height
const DAY_BAND_H = 28  // bottom slice of chart area for daylight
const TEMP_H = CHART_H - DAY_BAND_H  // 102px for temperature
const XAXIS_H = 24
const AID_H = 48

function totalH() {
  return MT + CHART_H + XAXIS_H + AID_H + MB  // 222
}

// ── Helpers ────────────────────────────────────────────────────────────────

function cardinalSpline(pts: [number, number][], tension = 0.4): string {
  if (pts.length < 2) return ''
  const out: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3
    out.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    )
  }
  return out.join(' ')
}

function niceTicks(min: number, max: number, target = 4): number[] {
  const range = max - min
  if (range === 0) return [Math.round(min)]
  const raw = range / target
  const step = raw <= 5 ? 5 : raw <= 10 ? 10 : raw <= 15 ? 15 : 20
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = first; t <= max; t += step) ticks.push(t)
  return ticks
}

function fmtHour(ms: number): string {
  const h = new Date(ms).getHours()
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

function fmtWeekday(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short' })
}

function fmtAidTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtTransitionTime(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  const m = d.getMinutes()
  const hh = h % 12 || 12
  const mm = m > 0 ? `:${m.toString().padStart(2, '0')}` : ''
  return `${hh}${mm}${h < 12 ? 'a' : 'p'}`
}

function majorStations(stations: AidStation[]): AidStation[] {
  return stations.filter(s => s.isStart || s.isFinish || s.hasDropBag || s.hasCrewAccess)
}

// ── RaceOverviewSVG ────────────────────────────────────────────────────────

interface SVGProps {
  entries: RaceWeatherEntry[]
  aidStations: AidStation[]
  arrivalEstimates: ArrivalEstimate[]
  raceStart: Date
  width: number
}

function RaceOverviewSVG({ entries, aidStations, arrivalEstimates, raceStart, width }: SVGProps) {
  const drawWidth = width - ML - MR
  const svgH = totalH()

  const startMs = raceStart.getTime()
  const endMs =
    arrivalEstimates.length > 0
      ? arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival.getTime()
      : startMs + entries.length * 3_600_000
  const spanMs = endMs - startMs

  const xScale = (ms: number) => ML + ((ms - startMs) / spanMs) * drawWidth

  // Y positions
  const chartY = MT
  const dayBandY = chartY + TEMP_H    // 114
  const xAxisY = chartY + CHART_H     // 142
  const aidY = xAxisY + XAXIS_H       // 166

  // Temperature y-scale (padded range)
  const temps = entries.map(e => e.temperature)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const tMin = minTemp - 5
  const tMax = maxTemp + 5
  const tRange = tMax - tMin  // always >= 10
  const yTemp = (t: number) => chartY + TEMP_H - ((t - tMin) / tRange) * TEMP_H

  // Temperature line points
  const tempPts: [number, number][] = entries.map(e => [
    xScale(new Date(e.hour).getTime()),
    yTemp(e.temperature),
  ])

  // Y-axis grid ticks
  const tempTicks = niceTicks(tMin, tMax, 4)

  // Min/max annotation entries
  const minE = entries.reduce((a, b) => a.temperature <= b.temperature ? a : b)
  const maxE = entries.reduce((a, b) => a.temperature >= b.temperature ? a : b)
  const minX = xScale(new Date(minE.hour).getTime())
  const maxX = xScale(new Date(maxE.hour).getTime())
  const minY = yTemp(minE.temperature)
  const maxY = yTemp(maxE.temperature)
  const tooClose = Math.abs(minX - maxX) < 60

  // Daylight step-line points
  const dayTop = dayBandY + 4
  const dayBot = dayBandY + DAY_BAND_H - 4
  const dayPts: [number, number][] = entries.map(e => [
    xScale(new Date(e.hour).getTime()),
    e.isNight ? dayBot : dayTop,
  ])
  const dayPath = dayPts.length > 0
    ? 'M ' + dayPts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')
    : ''

  // Sunrise / sunset transitions
  const transitions: { x: number; isSunrise: boolean; label: string }[] = []
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].isNight !== entries[i - 1].isNight) {
      const msA = new Date(entries[i - 1].hour).getTime()
      const msB = new Date(entries[i].hour).getTime()
      const midMs = (msA + msB) / 2
      transitions.push({
        x: xScale(midMs),
        isSunrise: entries[i - 1].isNight,
        label: fmtTransitionTime(midMs),
      })
    }
  }

  // Precip: pixel width of one hour
  const hourPx =
    entries.length > 1
      ? xScale(new Date(entries[1].hour).getTime()) - xScale(new Date(entries[0].hour).getTime())
      : drawWidth / 24

  // X-axis ticks
  const raceHours = spanMs / 3_600_000
  const tickInterval = raceHours <= 24 ? 2 : raceHours <= 48 ? 4 : 6
  const ticks: { ms: number; isDateChange: boolean }[] = []
  {
    let t = Math.ceil(startMs / (tickInterval * 3_600_000)) * tickInterval * 3_600_000
    while (t <= startMs) t += tickInterval * 3_600_000
    let prevDate = new Date(startMs).toDateString()
    while (t <= endMs) {
      const isDateChange = new Date(t).toDateString() !== prevDate
      ticks.push({ ms: t, isDateChange })
      prevDate = new Date(t).toDateString()
      t += tickInterval * 3_600_000
    }
  }

  // Aid stations — iterate estimates to preserve per-visit ordering for loops/out-and-backs
  const stationPositions = arrivalEstimates
    .map(est => {
      const station =
        aidStations.find(s => s.order === est.order) ??
        aidStations.find(s => s.name === est.name)
      if (!station) return null
      if (!station.isStart && !station.isFinish && !station.hasDropBag && !station.hasCrewAccess) return null
      return { station, x: xScale(est.estimatedArrival.getTime()), arrivalTime: est.estimatedArrival }
    })
    .filter(Boolean) as { station: AidStation; x: number; arrivalTime: Date }[]

  const startStation = aidStations.find(s => s.isStart) ?? ({ name: 'Start', distanceFromStart: 0, isStart: true } as AidStation)
  const allStations = [
    { station: startStation, x: xScale(startMs), arrivalTime: raceStart },
    ...stationPositions.filter(sp => !sp.station.isStart),
  ]

  return (
    <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id="wt-chart">
          <rect x={ML} y={chartY} width={drawWidth} height={CHART_H} />
        </clipPath>
        <clipPath id="wt-temp">
          <rect x={ML} y={chartY} width={drawWidth} height={TEMP_H} />
        </clipPath>
        <clipPath id="wt-day">
          <rect x={ML} y={dayBandY} width={drawWidth} height={DAY_BAND_H} />
        </clipPath>
      </defs>

      {/* ── Layer 1: Precipitation background wash ── */}
      {entries.map((e, i) => {
        if (e.precipitationProbability === 0) return null
        const opacity = (e.precipitationProbability / 100) * 0.25
        const x = xScale(new Date(e.hour).getTime()) - hourPx / 2
        return (
          <rect
            key={i}
            x={x}
            y={chartY}
            width={hourPx}
            height={CHART_H}
            fill={C.ridgeBlue}
            opacity={opacity}
            clipPath="url(#wt-chart)"
          />
        )
      })}

      {/* ── Y-axis: grid lines + tick labels ── */}
      {tempTicks.map((t, i) => {
        const y = yTemp(t)
        if (y < chartY - 1 || y > chartY + TEMP_H + 1) return null
        return (
          <g key={i}>
            <line
              x1={ML} y1={y} x2={ML + drawWidth} y2={y}
              stroke={C.sky} strokeWidth={1} opacity={0.2}
            />
            <text
              x={ML - 4} y={y + 4}
              fontSize={10} fill={C.deepRidge} opacity={0.7}
              fontFamily="inherit" textAnchor="end"
            >
              {Math.round(t)}°
            </text>
          </g>
        )
      })}

      {/* ── Layer 2: Temperature line ── */}
      {tempPts.length > 1 && (
        <path
          d={cardinalSpline(tempPts)}
          fill="none"
          stroke={C.ridgeBlue}
          strokeWidth={2.5}
          clipPath="url(#wt-temp)"
        />
      )}

      {/* Min annotation */}
      <circle cx={minX} cy={minY} r={4} fill={C.ridgeBlue} clipPath="url(#wt-temp)" />
      <text
        x={minX}
        y={tooClose ? minY + 26 : minY + 16}
        fontSize={11} fill={C.ridgeBlue} fontFamily="monospace" textAnchor="middle"
      >
        {Math.round(minE.temperature)}°
      </text>

      {/* Max annotation (only if different hour from min) */}
      {minE.hour !== maxE.hour && (
        <>
          <circle cx={maxX} cy={maxY} r={4} fill={C.ridgeBlue} clipPath="url(#wt-temp)" />
          <text
            x={maxX}
            y={maxY - 8}
            fontSize={11} fill={C.ridgeBlue} fontFamily="monospace" textAnchor="middle"
          >
            {Math.round(maxE.temperature)}°
          </text>
        </>
      )}

      {/* ── Daylight band separator ── */}
      <line
        x1={ML} y1={dayBandY} x2={ML + drawWidth} y2={dayBandY}
        stroke={C.sky} strokeWidth={1} opacity={0.3}
      />

      {/* ── Layer 3: Daylight step line ── */}
      {dayPath && (
        <path
          d={dayPath}
          fill="none"
          stroke={C.sky}
          strokeWidth={2}
          clipPath="url(#wt-day)"
        />
      )}

      {/* Sunrise / sunset labels */}
      {transitions.map((tr, i) => {
        const lx = Math.max(ML + 2, Math.min(tr.x, ML + drawWidth - 2))
        return (
          <g key={i}>
            <line
              x1={tr.x} y1={dayBandY + 2} x2={tr.x} y2={dayBandY + DAY_BAND_H - 2}
              stroke={C.sky} strokeWidth={1} opacity={0.6}
            />
            <text
              x={lx} y={dayBandY - 3}
              fontSize={10} fill={C.midnight} fontFamily="inherit" textAnchor="start"
            >
              {tr.isSunrise ? `☀️ ${tr.label}` : `🌙 ${tr.label}`}
            </text>
          </g>
        )
      })}

      {/* ── X-axis ── */}
      {ticks.map((tick, i) => {
        const x = xScale(tick.ms)
        return (
          <g key={i}>
            <line
              x1={x} y1={xAxisY} x2={x} y2={xAxisY + 5}
              stroke={C.sky} strokeWidth={1} opacity={0.5}
            />
            {tick.isDateChange ? (
              <>
                <text
                  x={x} y={xAxisY + 9}
                  fontSize={9} fill={C.ridgeBlue} fontWeight="600"
                  fontFamily="inherit" textAnchor="middle"
                >
                  {fmtWeekday(tick.ms)}
                </text>
                <text
                  x={x} y={xAxisY + 20}
                  fontSize={9} fill={C.deepRidge} opacity={0.7}
                  fontFamily="inherit" textAnchor="middle"
                >
                  {fmtHour(tick.ms)}
                </text>
              </>
            ) : (
              <text
                x={x} y={xAxisY + 16}
                fontSize={9} fill={C.deepRidge} opacity={0.7}
                fontFamily="inherit" textAnchor="middle"
              >
                {fmtHour(tick.ms)}
              </text>
            )}
          </g>
        )
      })}

      {/* ── Aid station rule + markers ── */}
      <line
        x1={ML} y1={aidY} x2={ML + drawWidth} y2={aidY}
        stroke={C.sky} strokeWidth={1} opacity={0.5}
      />
      {allStations.map((sp, i) => {
        const x = sp.x
        const distMi = (sp.station.distanceFromStart * 0.621371).toFixed(1)
        const timeStr = fmtAidTime(sp.arrivalTime)
        const isStart = sp.station.isStart || (i === 0 && sp.station.distanceFromStart === 0)
        const isFinish = sp.station.isFinish
        const labelAbove = i % 2 === 0
        const labelY = labelAbove ? aidY - 8 : aidY + 18
        const shortName = isStart
          ? 'Start'
          : isFinish
            ? 'Finish'
            : sp.station.name.length > 12
              ? sp.station.name.slice(0, 11) + '…'
              : sp.station.name
        return (
          <g key={i}>
            <line x1={x} y1={aidY - 4} x2={x} y2={aidY + 4} stroke={C.ridgeBlue} strokeWidth={1.5} />
            <circle cx={x} cy={aidY} r={3} fill={C.ridgeBlue} />
            <text
              x={x} y={labelY}
              fontSize={9} fill={C.midnight} fontFamily="inherit" fontWeight="600" textAnchor="middle"
            >
              {shortName}
            </text>
            <text
              x={x} y={labelY + (labelAbove ? -9 : 9)}
              fontSize={8} fill={C.deepRidge} opacity={0.7} fontFamily="inherit" textAnchor="middle"
            >
              {isStart ? timeStr : `${distMi}mi · ${timeStr}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Placeholder (no pace set) ──────────────────────────────────────────────

function PlaceholderRows({ width }: { width: number }) {
  const drawWidth = width - ML - MR
  const svgH = totalH()
  const chartY = MT
  const dayBandY = chartY + TEMP_H

  return (
    <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} style={{ display: 'block' }}>
      <rect x={ML} y={chartY} width={drawWidth} height={TEMP_H} rx={4} fill="#F0F0F0" />
      <rect x={ML} y={dayBandY} width={drawWidth} height={DAY_BAND_H} rx={0} fill="#E8E8E8" />
      <text
        x={ML + drawWidth / 2} y={chartY + TEMP_H / 2 + 4}
        fontSize={12} fill="#999" fontFamily="inherit" textAnchor="middle"
      >
        Set your pace above to see weather aligned to your race
      </text>
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function WeatherTimeline({
  entries,
  aidStations,
  arrivalEstimates,
  raceStart,
  totalDistanceMiles,
  forecastAvailable = true,
  unavailableReason,
}: WeatherTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(es => {
      if (es[0]) setContainerWidth(es[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    setContainerWidth(containerRef.current.clientWidth)
    return () => ro.disconnect()
  }, [])

  const raceEnd =
    arrivalEstimates.length > 0
      ? arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival
      : null
  const raceHours = raceEnd
    ? (raceEnd.getTime() - raceStart.getTime()) / 3_600_000
    : null

  const header = (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Weather Overview
      </span>
      {raceHours !== null && (
        <span className="text-xs text-muted-foreground">
          {totalDistanceMiles.toFixed(1)} mi · ~{Math.round(raceHours)}h
        </span>
      )}
    </div>
  )

  if (!forecastAvailable) {
    return (
      <div className="rounded-lg border p-5">
        {header}
        <div className="rounded border border-dashed py-5 text-center">
          <p className="text-sm text-muted-foreground">
            {unavailableReason ?? 'Forecast not yet available'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Weather forecasts are available up to 16 days before the race.
          </p>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border p-5">
        {header}
        <div ref={containerRef} className="w-full">
          {containerWidth > 0 && <PlaceholderRows width={containerWidth} />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-5">
      {header}
      <div ref={containerRef} className="w-full">
        {containerWidth > 0 && (
          <RaceOverviewSVG
            entries={entries}
            aidStations={aidStations}
            arrivalEstimates={arrivalEstimates}
            raceStart={raceStart}
            width={containerWidth}
          />
        )}
      </div>
    </div>
  )
}
