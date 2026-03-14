'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { calculateArrivalTimes, type ArrivalEstimate, type PaceConfig } from '@/lib/pace-calculator'
import type { AidStation } from '@/types/gpx'

interface PaceInputProps {
  aidStations: AidStation[]
  raceStart: Date
  totalDistanceKm: number
  onArrivalEstimatesChange: (estimates: ArrivalEstimate[]) => void
}

export function PaceInput({
  aidStations,
  raceStart,
  totalDistanceKm,
  onArrivalEstimatesChange,
}: PaceInputProps) {
  const [mode, setMode] = useState<'pace' | 'finish'>('pace')
  const [paceMin, setPaceMin] = useState('15')
  const [paceSec, setPaceSec] = useState('00')
  const [finishHours, setFinishHours] = useState('24')
  const [finishMins, setFinishMins] = useState('00')

  const recalculate = (
    newMode: 'pace' | 'finish',
    pm: string,
    ps: string,
    fh: string,
    fm: string
  ) => {
    let config: PaceConfig

    if (newMode === 'pace') {
      const minutes = parseInt(pm || '0', 10) + parseInt(ps || '0', 10) / 60
      if (minutes <= 0) return
      config = { mode: 'pace', minutesPerMile: minutes }
    } else {
      const totalMinutes = parseInt(fh || '0', 10) * 60 + parseInt(fm || '0', 10)
      if (totalMinutes <= 0) return
      config = { mode: 'finish', targetMinutes: totalMinutes, totalDistanceKm }
    }

    const estimates = calculateArrivalTimes(config, aidStations, raceStart)
    onArrivalEstimatesChange(estimates)
  }

  const handlePaceChange = (min: string, sec: string) => {
    setPaceMin(min)
    setPaceSec(sec)
    recalculate('pace', min, sec, finishHours, finishMins)
  }

  const handleFinishChange = (h: string, m: string) => {
    setFinishHours(h)
    setFinishMins(m)
    recalculate('finish', paceMin, paceSec, h, m)
  }

  const switchMode = (newMode: 'pace' | 'finish') => {
    setMode(newMode)
    recalculate(newMode, paceMin, paceSec, finishHours, finishMins)
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Pace</span>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={mode === 'pace' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => switchMode('pace')}
          >
            Min/mile
          </Button>
          <Button
            variant={mode === 'finish' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => switchMode('finish')}
          >
            Finish time
          </Button>
        </div>
      </div>

      {mode === 'pace' ? (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">Min:Sec / mi</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max="59"
              value={paceMin}
              onChange={(e) => handlePaceChange(e.target.value, paceSec)}
              className="w-16 h-8 text-center"
              placeholder="15"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={paceSec}
              onChange={(e) => handlePaceChange(paceMin, e.target.value)}
              className="w-16 h-8 text-center"
              placeholder="00"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">H:MM finish</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max="72"
              value={finishHours}
              onChange={(e) => handleFinishChange(e.target.value, finishMins)}
              className="w-16 h-8 text-center"
              placeholder="24"
            />
            <span className="text-muted-foreground">h</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={finishMins}
              onChange={(e) => handleFinishChange(finishHours, e.target.value)}
              className="w-16 h-8 text-center"
              placeholder="00"
            />
            <span className="text-muted-foreground">m</span>
          </div>
        </div>
      )}
    </div>
  )
}
