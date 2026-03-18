'use client'

import { useMemo } from 'react'
import type { TrackPoint, AidStation } from '@/types/gpx'
import { cumulativeDistances } from '@/lib/geo-utils'

interface ElevationStripProps {
  trackPoints: TrackPoint[]
  aidStations: AidStation[]
}

const KM_TO_MI = 0.621371
const VIEWBOX_W = 1000
const VIEWBOX_H = 64

export function ElevationStrip({ trackPoints, aidStations }: ElevationStripProps) {
  const { path, aidMarkers } = useMemo(() => {
    if (trackPoints.length < 2) return { path: '', aidMarkers: [] }

    const cumKm = cumulativeDistances(trackPoints)
    const distances = cumKm.map((d) => d * KM_TO_MI)
    const elevations = trackPoints.map((pt) => pt.ele)

    const totalDist = distances[distances.length - 1]
    const minEle = Math.min(...elevations)
    const maxEle = Math.max(...elevations)
    const eleRange = maxEle - minEle || 1

    const toX = (d: number) => (d / totalDist) * VIEWBOX_W
    const toY = (e: number) => VIEWBOX_H - ((e - minEle) / eleRange) * VIEWBOX_H

    const points = distances.map((d, i) => `${toX(d).toFixed(1)},${toY(elevations[i]).toFixed(1)}`)
    const path = `M ${points.join(' L ')}`

    const aidMarkers = aidStations
      .map((s) => {
        const dist = s.distanceFromStart * KM_TO_MI
        if (dist > totalDist) return null
        const nearestIdx = cumKm.reduce(
          (best, d, i) =>
            Math.abs(d - s.distanceFromStart) < Math.abs(cumKm[best] - s.distanceFromStart) ? i : best,
          0
        )
        const x = toX(dist)
        const y = toY(elevations[nearestIdx])
        const elevationFraction = (elevations[nearestIdx] - minEle) / eleRange
        const labelAbove = elevationFraction < 0.5
        return { x, y, name: s.name.slice(0, 6), order: s.order, labelAbove }
      })
      .filter(Boolean)

    return { path, aidMarkers }
  }, [trackPoints, aidStations])

  if (trackPoints.length < 2) return null

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="w-full"
      style={{ height: 64 }}
      aria-label="Elevation strip"
    >
      <path
        d={`${path} L ${VIEWBOX_W},${VIEWBOX_H} L 0,${VIEWBOX_H} Z`}
        fill="#DBF1FA"
      />
      <path d={path} fill="none" stroke="#1D7CBE" strokeWidth="2" strokeLinejoin="round" />
      {aidMarkers.map(
        (m) =>
          m && (
            <g key={m.order}>
              <circle cx={m.x} cy={m.y} r="4" fill="#1D7CBE" />
              <text
                x={m.x}
                y={m.labelAbove ? m.y - 7 : m.y + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#114574"
              >
                {m.name}
              </text>
            </g>
          )
      )}
    </svg>
  )
}
