'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface LibraryRace {
  raceId: string
  name: string
  location?: string | null
  date: string
  crewShareToken?: string
  totalMi?: number
}

interface LocalPlan {
  shareToken: string
  editKey: string
  name: string
  date: string
}

interface Props {
  races: LibraryRace[]
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function loadLocalPlans(): LocalPlan[] {
  try {
    const raw = localStorage.getItem('planultra_plans')
    if (!raw) return []
    return JSON.parse(raw) as LocalPlan[]
  } catch {
    return []
  }
}

function savePlan(shareToken: string, editKey: string, name: string, date: string) {
  try {
    type Entry = { shareToken: string; editKey: string; name: string; date: string }
    const existing = JSON.parse(localStorage.getItem('planultra_plans') ?? '[]') as Entry[]
    const filtered = existing.filter((p) => p.shareToken !== shareToken)
    filtered.unshift({ shareToken, editKey, name, date })
    localStorage.setItem('planultra_plans', JSON.stringify(filtered.slice(0, 20)))
  } catch {}
}

export function RaceMenu({ races }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copying, setCopying] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [localPlans, setLocalPlans] = useState<LocalPlan[]>([])

  useEffect(() => {
    setLocalPlans(loadLocalPlans())
  }, [])

  const filtered = filter.trim()
    ? races.filter(
        (r) =>
          r.name.toLowerCase().includes(filter.toLowerCase()) ||
          (r.location ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : races

  const clampedIdx = Math.min(selectedIdx, Math.max(0, filtered.length - 1))

  const handleCopy = useCallback(
    async (race: LibraryRace) => {
      if (copying) return
      setCopying(race.raceId)
      setCopyError(null)
      try {
        const res = await fetch('/api/plans/from-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryRaceId: race.raceId }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to copy plan')
        }
        const { shareToken, editKey } = await res.json()
        savePlan(shareToken, editKey, race.name, race.date)
        router.push(`/crew/${shareToken}/edit/${editKey}/stations`)
      } catch (err) {
        setCopyError(err instanceof Error ? err.message : 'Something went wrong')
        setCopying(null)
      }
    },
    [copying, router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        handleCopy(filtered[clampedIdx])
      }
    },
    [filtered, clampedIdx, handleCopy]
  )

  return (
    <div className="win" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="win-t">
        <span>SELECT RACE</span>
        <span>{races.length} IN LIBRARY</span>
      </div>
      <label className="prompt">
        <span>&gt;</span>
        <input
          type="search"
          placeholder="search races"
          aria-label="Search races"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setSelectedIdx(0)
          }}
        />
      </label>
      <ul className="menu">
        {filtered.map((race, i) => {
          const isSel = i === clampedIdx
          const isLoading = copying === race.raceId
          return (
            <li key={race.raceId}>
              <a
                href="#"
                className={isSel ? 'sel' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setSelectedIdx(i)
                  handleCopy(race)
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span className="cur">►</span>
                <span className="nm">{isLoading ? 'LOADING...' : race.name}</span>
                <span className="dots" />
                <span className="mi">{race.totalMi != null ? `${race.totalMi} MI` : ''}</span>
                <span className="meta">
                  {race.location ? `${race.location} · ` : ''}
                  {formatDate(race.date)}
                </span>
              </a>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li style={{ padding: '12px 16px', color: 'rgba(219,241,250,0.5)', fontSize: 13 }}>
            No races found.
          </li>
        )}
      </ul>
      {copyError && (
        <p style={{ padding: '0 16px 8px', fontSize: 12, color: '#f87171', margin: 0 }}>
          ERROR: {copyError}
        </p>
      )}
      <div className="win-foot">
        <small>Not listed? Bring the GPX file.</small>
        <a className="pbtn" href="/new">
          + ADD RACE
        </a>
      </div>
      {localPlans.length > 0 && (
        <div className="saved">
          SAVED ON THIS DEVICE:{' '}
          {localPlans.slice(0, 3).map((plan, i) => (
            <span key={plan.shareToken}>
              {i > 0 && ', '}
              <a href={`/crew/${plan.shareToken}`}>{plan.name}</a>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
