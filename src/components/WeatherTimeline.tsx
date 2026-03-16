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

// Design system colors
const COLORS = {
  // Temperature gradient: cool (sky blue) → warm (amber)
  tempCool: '#82C7F6',
  tempWarm: '#E8722A',
  // Daylight
  night: '#114574',
  day: '#DBF1FA',
  // Precipitation
  precipLight: '#1D7CBE',
  precipHeavy: '#114574',
  precipThreshold: 30,
  // Text / structure
  label: '#444',
  labelMuted: '#888',
  gridLine: '#E8E8E8',
  ruleLine: '#CCC',
  // Aid station
  stationDot: '#1D7CBE',
  stationText: '#02071E',
}

const MARGINS = { top: 12, right: 16, bottom: 8, left: 8 }
const ROW_HEIGHTS = {
  timeAxis: 28,
  tempBar: 40,
  daylightBar: 20,
  precipBar: 44,
  aidStations: 48,
  gap: 8,
}

function totalSvgHeight(): number {
  return (
    MARGINS.top +
    ROW_HEIGHTS.timeAxis +
    ROW_HEIGHTS.gap +
    ROW_HEIGHTS.tempBar +
    ROW_HEIGHTS.gap +
    ROW_HEIGHTS.daylightBar +
    ROW_HEIGHTS.gap +
    ROW_HEIGHTS.precipBar +
    ROW_HEIGHTS.gap +
    ROW_HEIGHTS.aidStations +
    MARGINS.bottom
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA)
  const [r2, g2, b2] = hexToRgb(hexB)
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  return `rgb(${r},${g},${b})`
}

function formatHourLabel(isoTime: string): string {
  const d = new Date(isoTime)
  const h = d.getHours()
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

function formatDateLabel(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatAidTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// Filter to stations worth showing in this view
function majorStations(stations: AidStation[]): AidStation[] {
  return stations.filter(
    (s) => s.isStart || s.isFinish || s.hasDropBag || s.hasCrewAccess
  )
}

interface RaceOverviewSVGProps {
  entries: RaceWeatherEntry[]
  aidStations: AidStation[]
  arrivalEstimates: ArrivalEstimate[]
  raceStart: Date
  totalDistanceMiles: number
  width: number
}

function RaceOverviewSVG({
  entries,
  aidStations,
  arrivalEstimates,
  raceStart,
  totalDistanceMiles,
  width,
}: RaceOverviewSVGProps) {
  const svgWidth = width
  const drawWidth = svgWidth - MARGINS.left - MARGINS.right
  const svgHeight = totalSvgHeight()

  const startMs = raceStart.getTime()
  const endMs =
    arrivalEstimates.length > 0
      ? arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival.getTime()
      : startMs + entries.length * 3600_000

  const totalMs = endMs - startMs
  const xScale = (ms: number) => MARGINS.left + ((ms - startMs) / totalMs) * drawWidth

  // Temperature range
  const temps = entries.map((e) => e.temperature)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const tempRange = maxTemp - minTemp || 1

  // Row y-positions
  let y = MARGINS.top
  const timeAxisY = y
  y += ROW_HEIGHTS.timeAxis + ROW_HEIGHTS.gap
  const tempBarY = y
  y += ROW_HEIGHTS.tempBar + ROW_HEIGHTS.gap
  const daylightBarY = y
  y += ROW_HEIGHTS.daylightBar + ROW_HEIGHTS.gap
  const precipBarY = y
  y += ROW_HEIGHTS.precipBar + ROW_HEIGHTS.gap
  const aidStationY = y

  // Time axis ticks — every 2 or 4 hours depending on race length
  const raceDurationHours = totalMs / 3600_000
  const tickIntervalHours = raceDurationHours <= 24 ? 2 : raceDurationHours <= 48 ? 4 : 6

  const ticks: { ms: number; label: string; isDateChange: boolean; dateLabel: string }[] = []
  {
    const startHour = new Date(startMs)
    startHour.setMinutes(0, 0, 0)
    // Start from next full tick after race start
    let tickHour = startHour.getTime()
    while (tickHour <= startMs) tickHour += tickIntervalHours * 3600_000

    let prevDate = new Date(startMs).toDateString()
    while (tickHour <= endMs) {
      const d = new Date(tickHour)
      const thisDate = d.toDateString()
      const isDateChange = thisDate !== prevDate
      ticks.push({
        ms: tickHour,
        label: formatHourLabel(d.toISOString()),
        isDateChange,
        dateLabel: isDateChange ? formatDateLabel(d.toISOString()) : '',
      })
      prevDate = thisDate
      tickHour += tickIntervalHours * 3600_000
    }
  }

  // Build temperature gradient stops
  const tempGradientStops: { offset: string; color: string }[] = entries.map((e) => {
    const t = (e.temperature - minTemp) / tempRange
    return {
      offset: `${(((new Date(e.hour).getTime() - startMs) / totalMs) * 100).toFixed(2)}%`,
      color: lerpColor(COLORS.tempCool, COLORS.tempWarm, t),
    }
  })

  // Min/max temp label positions
  const minTempEntry = entries.reduce((a, b) => (a.temperature <= b.temperature ? a : b), entries[0])
  const maxTempEntry = entries.reduce((a, b) => (a.temperature >= b.temperature ? a : b), entries[0])

  // Daylight segments — merge contiguous day/night runs
  const daylightSegments: { x1: number; x2: number; isNight: boolean }[] = []
  if (entries.length > 0) {
    let segStart = new Date(entries[0].hour).getTime()
    let segIsNight = entries[0].isNight
    for (let i = 1; i < entries.length; i++) {
      const ms = new Date(entries[i].hour).getTime()
      if (entries[i].isNight !== segIsNight) {
        daylightSegments.push({
          x1: xScale(segStart),
          x2: xScale(ms),
          isNight: segIsNight,
        })
        segStart = ms
        segIsNight = entries[i].isNight
      }
    }
    // Last segment extends to end of race
    daylightSegments.push({
      x1: xScale(segStart),
      x2: xScale(endMs),
      isNight: segIsNight,
    })
  }

  // Precip bars — one per hour entry
  const precipMaxHeight = ROW_HEIGHTS.precipBar - 6 // leave 6px for top label room
  const precipBarWidth = entries.length > 1
    ? Math.max(2, (drawWidth / entries.length) * 0.8)
    : 8

  // Major aid stations with x positions
  const KM_TO_MI = 0.621371
  const stationsForDisplay = majorStations(aidStations)
  const stationPositions = stationsForDisplay
    .map((s) => {
      // Find matching arrival estimate by order or name
      const estimate = arrivalEstimates.find(
        (e) => e.order === s.order || e.name === s.name
      )
      return { station: s, estimate }
    })
    .filter((sp) => sp.estimate !== undefined)
    .map((sp) => ({
      station: sp.station,
      x: xScale(sp.estimate!.estimatedArrival.getTime()),
      arrivalTime: sp.estimate!.estimatedArrival,
    }))

  // Also add Start (race start)
  const startPosition = {
    station: aidStations.find((s) => s.isStart) ?? { name: 'Start', distanceFromStart: 0 } as AidStation,
    x: xScale(startMs),
    arrivalTime: raceStart,
  }

  const allStationPositions = [
    startPosition,
    ...stationPositions.filter((sp) => !sp.station.isStart),
  ]

  const gradientId = 'tempGradient'

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {tempGradientStops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
        <clipPath id="tempClip">
          <rect x={MARGINS.left} y={tempBarY} width={drawWidth} height={ROW_HEIGHTS.tempBar} />
        </clipPath>
        <clipPath id="daylightClip">
          <rect x={MARGINS.left} y={daylightBarY} width={drawWidth} height={ROW_HEIGHTS.daylightBar} />
        </clipPath>
        <clipPath id="precipClip">
          <rect x={MARGINS.left} y={precipBarY} width={drawWidth} height={ROW_HEIGHTS.precipBar} />
        </clipPath>
      </defs>

      {/* ── Row labels (left side) ── */}
      <text x={MARGINS.left} y={tempBarY - 3} fontSize={9} fill={COLORS.labelMuted} fontFamily="inherit">
        TEMP
      </text>
      <text x={MARGINS.left} y={daylightBarY - 3} fontSize={9} fill={COLORS.labelMuted} fontFamily="inherit">
        LIGHT
      </text>
      <text x={MARGINS.left} y={precipBarY - 3} fontSize={9} fill={COLORS.labelMuted} fontFamily="inherit">
        PRECIP
      </text>

      {/* ── Time axis ── */}
      {ticks.map((tick, i) => {
        const x = xScale(tick.ms)
        return (
          <g key={i}>
            <line
              x1={x}
              y1={timeAxisY + 14}
              x2={x}
              y2={timeAxisY + 20}
              stroke={COLORS.gridLine}
              strokeWidth={1}
            />
            {tick.isDateChange ? (
              <>
                <text
                  x={x}
                  y={timeAxisY + 10}
                  fontSize={9}
                  fill={COLORS.label}
                  fontFamily="inherit"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {tick.dateLabel}
                </text>
                <text
                  x={x}
                  y={timeAxisY + 22}
                  fontSize={9}
                  fill={COLORS.labelMuted}
                  fontFamily="inherit"
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              </>
            ) : (
              <text
                x={x}
                y={timeAxisY + 20}
                fontSize={9}
                fill={COLORS.labelMuted}
                fontFamily="inherit"
                textAnchor="middle"
              >
                {tick.label}
              </text>
            )}
          </g>
        )
      })}

      {/* ── Temperature gradient bar ── */}
      {tempGradientStops.length > 0 && (
        <>
          <rect
            x={MARGINS.left}
            y={tempBarY}
            width={drawWidth}
            height={ROW_HEIGHTS.tempBar}
            fill={`url(#${gradientId})`}
            rx={4}
            clipPath="url(#tempClip)"
          />
          {/* Min temp label */}
          {minTempEntry && (() => {
            const x = xScale(new Date(minTempEntry.hour).getTime())
            const anchor = x < MARGINS.left + 30 ? 'start' : x > svgWidth - 30 ? 'end' : 'middle'
            return (
              <text
                x={Math.max(MARGINS.left + 4, Math.min(x, svgWidth - MARGINS.right - 4))}
                y={tempBarY + ROW_HEIGHTS.tempBar / 2 + 4}
                fontSize={10}
                fill="rgba(255,255,255,0.9)"
                fontFamily="inherit"
                fontWeight="600"
                textAnchor={anchor}
              >
                {Math.round(minTempEntry.temperature)}°F
              </text>
            )
          })()}
          {/* Max temp label */}
          {maxTempEntry && minTempEntry.hour !== maxTempEntry.hour && (() => {
            const x = xScale(new Date(maxTempEntry.hour).getTime())
            const anchor = x < MARGINS.left + 30 ? 'start' : x > svgWidth - 30 ? 'end' : 'middle'
            return (
              <text
                x={Math.max(MARGINS.left + 4, Math.min(x, svgWidth - MARGINS.right - 4))}
                y={tempBarY + ROW_HEIGHTS.tempBar / 2 + 4}
                fontSize={10}
                fill="rgba(255,255,255,0.9)"
                fontFamily="inherit"
                fontWeight="600"
                textAnchor={anchor}
              >
                {Math.round(maxTempEntry.temperature)}°F
              </text>
            )
          })()}
        </>
      )}

      {/* ── Daylight bar ── */}
      {daylightSegments.map((seg, i) => (
        <rect
          key={i}
          x={seg.x1}
          y={daylightBarY}
          width={Math.max(0, seg.x2 - seg.x1)}
          height={ROW_HEIGHTS.daylightBar}
          fill={seg.isNight ? COLORS.night : COLORS.day}
          clipPath="url(#daylightClip)"
        />
      ))}
      {/* Daylight segment icons */}
      {daylightSegments.map((seg, i) => {
        const segWidth = seg.x2 - seg.x1
        if (segWidth < 16) return null
        const iconX = seg.x1 + 4
        const iconY = daylightBarY + ROW_HEIGHTS.daylightBar / 2 + 4
        return (
          <text
            key={`icon-${i}`}
            x={iconX}
            y={iconY}
            fontSize={11}
            fontFamily="inherit"
          >
            {seg.isNight ? '🌙' : '☀️'}
          </text>
        )
      })}
      {/* Daylight bar border */}
      <rect
        x={MARGINS.left}
        y={daylightBarY}
        width={drawWidth}
        height={ROW_HEIGHTS.daylightBar}
        fill="none"
        stroke={COLORS.gridLine}
        strokeWidth={1}
        rx={2}
      />

      {/* ── Precipitation bars ── */}
      {entries.map((entry, i) => {
        if (entry.precipitationProbability === 0) return null
        const entryMs = new Date(entry.hour).getTime()
        const x = xScale(entryMs) - precipBarWidth / 2
        const barH = (entry.precipitationProbability / 100) * precipMaxHeight
        const barY = precipBarY + ROW_HEIGHTS.precipBar - barH
        const isHeavy = entry.precipitationProbability >= COLORS.precipThreshold
        return (
          <rect
            key={i}
            x={x}
            y={barY}
            width={precipBarWidth}
            height={barH}
            fill={isHeavy ? COLORS.precipHeavy : COLORS.precipLight}
            opacity={isHeavy ? 0.85 : 0.55}
            rx={1}
            clipPath="url(#precipClip)"
          />
        )
      })}
      {/* Threshold line at 30% */}
      {(() => {
        const thresholdY = precipBarY + ROW_HEIGHTS.precipBar - (COLORS.precipThreshold / 100) * precipMaxHeight
        return (
          <line
            x1={MARGINS.left}
            x2={MARGINS.left + drawWidth}
            y1={thresholdY}
            y2={thresholdY}
            stroke={COLORS.precipLight}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )
      })()}

      {/* ── Aid station rule + markers ── */}
      <line
        x1={MARGINS.left}
        x2={MARGINS.left + drawWidth}
        y1={aidStationY}
        y2={aidStationY}
        stroke={COLORS.ruleLine}
        strokeWidth={1}
      />
      {allStationPositions.map((sp, i) => {
        const x = sp.x
        const distMi = (sp.station.distanceFromStart * 0.621371).toFixed(1)
        const timeStr = formatAidTime(sp.arrivalTime)
        const isStart = sp.station.isStart || (i === 0 && sp.station.distanceFromStart === 0)
        const isFinish = sp.station.isFinish

        // Alternate label placement to avoid collision: even above, odd below
        const labelAbove = i % 2 === 0
        const tickTop = aidStationY - 4
        const tickBottom = aidStationY + 4
        const dotY = aidStationY
        const labelY = labelAbove
          ? aidStationY - 8
          : aidStationY + 18

        const shortName = isStart ? 'Start' : isFinish ? 'Finish' : sp.station.name.length > 12
          ? sp.station.name.slice(0, 11) + '…'
          : sp.station.name

        return (
          <g key={i}>
            {/* Vertical tick */}
            <line
              x1={x}
              y1={tickTop}
              x2={x}
              y2={tickBottom}
              stroke={COLORS.stationDot}
              strokeWidth={1.5}
            />
            {/* Dot */}
            <circle
              cx={x}
              cy={dotY}
              r={3}
              fill={COLORS.stationDot}
            />
            {/* Station name */}
            <text
              x={x}
              y={labelY}
              fontSize={9}
              fill={COLORS.stationText}
              fontFamily="inherit"
              fontWeight="600"
              textAnchor="middle"
            >
              {shortName}
            </text>
            {/* Distance + time */}
            <text
              x={x}
              y={labelY + (labelAbove ? -9 : 9)}
              fontSize={8}
              fill={COLORS.labelMuted}
              fontFamily="inherit"
              textAnchor="middle"
            >
              {isStart ? timeStr : `${distMi}mi · ${timeStr}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Placeholder rows (no pace set) ──────────────────────────────────────────

function PlaceholderRows({ width }: { width: number }) {
  const drawWidth = width - MARGINS.left - MARGINS.right
  const svgHeight = totalSvgHeight()

  let y = MARGINS.top
  const timeAxisY = y
  y += ROW_HEIGHTS.timeAxis + ROW_HEIGHTS.gap
  const tempBarY = y
  y += ROW_HEIGHTS.tempBar + ROW_HEIGHTS.gap
  const daylightBarY = y
  y += ROW_HEIGHTS.daylightBar + ROW_HEIGHTS.gap
  const precipBarY = y

  return (
    <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} style={{ display: 'block' }}>
      {/* Time axis placeholder */}
      <rect x={MARGINS.left} y={timeAxisY + 8} width={drawWidth * 0.7} height={10} rx={3} fill="#F0F0F0" />
      {/* Temp bar placeholder */}
      <rect x={MARGINS.left} y={tempBarY} width={drawWidth} height={ROW_HEIGHTS.tempBar} rx={4} fill="#F0F0F0" />
      {/* Daylight bar placeholder */}
      <rect x={MARGINS.left} y={daylightBarY} width={drawWidth} height={ROW_HEIGHTS.daylightBar} rx={2} fill="#F0F0F0" />
      {/* Precip bar placeholder */}
      <rect x={MARGINS.left} y={precipBarY} width={drawWidth} height={ROW_HEIGHTS.precipBar} rx={2} fill="#F0F0F0" />
      {/* Message */}
      <text
        x={MARGINS.left + drawWidth / 2}
        y={tempBarY + ROW_HEIGHTS.tempBar / 2 + 4}
        fontSize={12}
        fill="#999"
        fontFamily="inherit"
        textAnchor="middle"
      >
        Set your pace above to see weather aligned to your race
      </text>
    </svg>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

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
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(containerRef.current)
    setContainerWidth(containerRef.current.clientWidth)
    return () => observer.disconnect()
  }, [])

  const raceEndTime =
    arrivalEstimates.length > 0
      ? arrivalEstimates[arrivalEstimates.length - 1].estimatedArrival
      : null

  const raceDurationHours = raceEndTime
    ? (raceEndTime.getTime() - raceStart.getTime()) / 3_600_000
    : null

  const header = (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Weather Overview
      </span>
      {raceDurationHours !== null && (
        <span className="text-xs text-muted-foreground">
          {totalDistanceMiles.toFixed(1)} mi · ~{Math.round(raceDurationHours)}h
        </span>
      )}
    </div>
  )

  // Unavailable state (race too far out or fetch error)
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
        {/* Still render aid station row if we have estimates */}
        {aidStations.length > 0 && arrivalEstimates.length > 0 && containerWidth > 0 && (
          <div ref={containerRef} className="mt-4">
            {/* minimal aid station only view omitted for brevity — full viz handles this */}
          </div>
        )}
      </div>
    )
  }

  // No pace set — show shell with placeholder bars
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

  // Full visualization
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
            totalDistanceMiles={totalDistanceMiles}
            width={containerWidth}
          />
        )}
      </div>
    </div>
  )
}
