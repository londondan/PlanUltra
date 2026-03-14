'use client'

import { useMemo } from 'react'
import type { TrackPoint, AidStation } from '@/types/gpx'
import { cumulativeDistances } from '@/lib/geo-utils'

interface ElevationProfileProps {
  trackPoints: TrackPoint[]
  aidStations?: AidStation[]
  unit?: 'mi' | 'km'
  className?: string
}

const KM_TO_MI = 0.621371
const VIEWBOX_W = 1000
const VIEWBOX_H = 200
const PADDING = { top: 16, right: 24, bottom: 32, left: 48 }

export function ElevationProfile({
  trackPoints,
  aidStations = [],
  unit = 'mi',
  className = '',
}: ElevationProfileProps) {
  const { path, aidMarkers, xTicks, yTicks, totalDist, minEle, maxEle } = useMemo(() => {
    if (trackPoints.length < 2) return { path: '', aidMarkers: [], xTicks: [], yTicks: [], totalDist: 0, minEle: 0, maxEle: 0 }

    const cumKm = cumulativeDistances(trackPoints)
    const distances = unit === 'mi' ? cumKm.map((d) => d * KM_TO_MI) : cumKm
    const elevations = trackPoints.map((pt) => pt.ele)

    const totalDist = distances[distances.length - 1]
    const minEle = Math.min(...elevations)
    const maxEle = Math.max(...elevations)
    const eleRange = maxEle - minEle || 1

    const W = VIEWBOX_W - PADDING.left - PADDING.right
    const H = VIEWBOX_H - PADDING.top - PADDING.bottom

    const toX = (d: number) => PADDING.left + (d / totalDist) * W
    const toY = (e: number) => PADDING.top + H - ((e - minEle) / eleRange) * H

    const points = distances.map((d, i) => `${toX(d).toFixed(1)},${toY(elevations[i]).toFixed(1)}`)
    const path = `M ${points.join(' L ')}`

    // Aid station markers
    const aidMarkers = aidStations.map((s) => {
      const distKm = s.distanceFromStart
      const dist = unit === 'mi' ? distKm * KM_TO_MI : distKm
      if (dist > totalDist) return null
      // Find nearest elevation
      const nearestIdx = cumKm.reduce((best, d, i) =>
        Math.abs(d - distKm) < Math.abs(cumKm[best] - distKm) ? i : best, 0)
      const x = toX(dist)
      const y = toY(elevations[nearestIdx])
      return { x, y, name: s.name, order: s.order }
    }).filter(Boolean)

    // X axis ticks (every ~10 mi or ~15 km)
    const tickInterval = unit === 'mi' ? 10 : 15
    const xTicks: { x: number; label: string }[] = []
    for (let d = 0; d <= totalDist; d += tickInterval) {
      xTicks.push({ x: toX(d), label: `${d.toFixed(0)}` })
    }

    // Y axis ticks (3-4 ticks)
    const yTicks: { y: number; label: string }[] = []
    const eleStep = eleRange / 3
    for (let i = 0; i <= 3; i++) {
      const ele = minEle + i * eleStep
      const label = unit === 'mi' ? `${(ele * 3.28084).toFixed(0)}ft` : `${ele.toFixed(0)}m`
      yTicks.push({ y: toY(ele), label })
    }

    return { path, aidMarkers, xTicks, yTicks, totalDist, minEle, maxEle }
  }, [trackPoints, aidStations, unit])

  if (trackPoints.length < 2) {
    return (
      <div className={`flex items-center justify-center h-24 bg-muted/30 rounded ${className}`}>
        <p className="text-xs text-muted-foreground">No elevation data</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full"
        style={{ height: 140 }}
        aria-label="Elevation profile"
      >
        {/* Area fill */}
        <path
          d={`${path} L ${VIEWBOX_W - PADDING.right},${VIEWBOX_H - PADDING.bottom} L ${PADDING.left},${VIEWBOX_H - PADDING.bottom} Z`}
          fill="rgba(239,68,68,0.1)"
        />
        {/* Route line */}
        <path d={path} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />

        {/* X axis */}
        <line
          x1={PADDING.left}
          y1={VIEWBOX_H - PADDING.bottom}
          x2={VIEWBOX_W - PADDING.right}
          y2={VIEWBOX_H - PADDING.bottom}
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        {/* X ticks */}
        {xTicks.map(({ x, label }) => (
          <g key={label}>
            <line x1={x} y1={VIEWBOX_H - PADDING.bottom} x2={x} y2={VIEWBOX_H - PADDING.bottom + 4} stroke="#94a3b8" strokeWidth="1" />
            <text x={x} y={VIEWBOX_H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {label}
            </text>
          </g>
        ))}

        {/* X axis label */}
        <text x={VIEWBOX_W / 2} y={VIEWBOX_H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">
          Distance ({unit})
        </text>

        {/* Y ticks */}
        {yTicks.map(({ y, label }) => (
          <g key={label}>
            <text x={PADDING.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
              {label}
            </text>
            <line x1={PADDING.left - 2} y1={y} x2={PADDING.left} y2={y} stroke="#94a3b8" strokeWidth="1" />
          </g>
        ))}

        {/* Aid station markers */}
        {aidMarkers.map((m) => m && (
          <g key={m.order}>
            <line x1={m.x} y1={m.y} x2={m.x} y2={VIEWBOX_H - PADDING.bottom} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={m.x} cy={m.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  )
}
