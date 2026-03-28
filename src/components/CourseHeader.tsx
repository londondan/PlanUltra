'use client'

import { useState, useEffect } from 'react'
import { CourseMap } from '@/components/CourseMap'
import { ElevationStrip } from '@/components/ElevationStrip'
import type { Race } from '@/lib/db/races'
import type { TrackPoint, AidStation } from '@/types/gpx'

interface CourseHeaderProps {
  race: Race
  trackPoints: TrackPoint[]
  aidStations: AidStation[]
}

const KM_TO_MI = 0.621371
const M_TO_FT = 3.28084

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function computeElevation(trackPoints: TrackPoint[]): { gainFt: number; lossFt: number } {
  let gain = 0
  let loss = 0
  for (let i = 1; i < trackPoints.length; i++) {
    const delta = trackPoints[i].ele - trackPoints[i - 1].ele
    if (delta > 0) gain += delta
    else loss += Math.abs(delta)
  }
  return { gainFt: gain * M_TO_FT, lossFt: loss * M_TO_FT }
}

export function CourseHeader({ race, trackPoints, aidStations }: CourseHeaderProps) {
  const [mapExpanded, setMapExpanded] = useState(false)
  const storageKey = `course-map-${race.raceId}`

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== null) setMapExpanded(stored === 'true')
  }, [storageKey])

  const toggleMap = () => {
    setMapExpanded((prev) => {
      const next = !prev
      localStorage.setItem(storageKey, String(next))
      return next
    })
  }

  const totalKm =
    aidStations.length > 0 ? aidStations[aidStations.length - 1].distanceFromStart : 0
  const totalMiles = (totalKm * KM_TO_MI).toFixed(1)
  const { gainFt, lossFt } = computeElevation(trackPoints)
  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const dropBagStations = aidStations.filter((s) => s.hasDropBag)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalMiles}</span> mi
        </span>
        <span>+{formatNumber(gainFt)} ft gain</span>
        <span>−{formatNumber(lossFt)} ft loss</span>
        <span>{raceDate}</span>
        <span>Start {race.startTime}</span>
      </div>
      <ElevationStrip trackPoints={trackPoints} aidStations={dropBagStations} />
      <button
        onClick={toggleMap}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Course map · tap to {mapExpanded ? 'collapse' : 'expand'}
      </button>
      {mapExpanded && (
        <CourseMap trackPoints={trackPoints} aidStations={aidStations} className="h-40 w-full" />
      )}
    </div>
  )
}
