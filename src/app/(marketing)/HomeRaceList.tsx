'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LibraryRace {
  raceId: string
  name: string
  date: string
  location?: string | null
  slug?: string
  isComplete: boolean
  crewShareToken?: string
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

function savePlanToLocalStorage(shareToken: string, editKey: string, name: string, date: string) {
  try {
    const key = 'planultra_plans'
    const existing: unknown[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    type PlanEntry = { shareToken: string; editKey: string; name: string; date: string }
    const filtered = (existing as PlanEntry[]).filter((p) => p.shareToken !== shareToken)
    filtered.unshift({ shareToken, editKey, name, date })
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)))
  } catch {
    // localStorage unavailable
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

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function HomeRaceList({ races }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [copying, setCopying] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [localPlans, setLocalPlans] = useState<LocalPlan[] | null>(null)

  // Lazy-load local plans on first render (client-only)
  if (localPlans === null && typeof window !== 'undefined') {
    setLocalPlans(loadLocalPlans())
  }

  const filtered = filter.trim()
    ? races.filter((r) =>
        r.name.toLowerCase().includes(filter.toLowerCase()) ||
        (r.location ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : races

  const handleCopy = async (race: LibraryRace) => {
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
      savePlanToLocalStorage(shareToken, editKey, race.name, race.date)
      router.push(`/crew/${shareToken}/edit/${editKey}/stations`)
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Something went wrong')
      setCopying(null)
    }
  }

  return (
    <div>
      {/* Local plans */}
      {localPlans && localPlans.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 12,
            }}
          >
            Your plans on this device
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {localPlans.map((plan) => (
              <a
                key={plan.shareToken}
                href={`/crew/${plan.shareToken}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(130,199,246,0.06)',
                  border: '1px solid rgba(130,199,246,0.15)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-dm-sans), system-ui',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'white',
                  }}
                >
                  {plan.name}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                  {formatDate(plan.date)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Race library */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h2
          style={{
            fontFamily: 'var(--font-dm-sans), system-ui',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Race library
        </h2>
        <input
          type="text"
          placeholder="Search races…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            fontFamily: 'var(--font-geist-sans), system-ui',
            fontSize: 13,
            color: 'white',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(130,199,246,0.2)',
            borderRadius: 8,
            padding: '6px 12px',
            outline: 'none',
            width: 180,
          }}
        />
      </div>

      {copyError && (
        <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{copyError}</p>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '32px 0' }}>
          No races found.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((race) => (
            <div
              key={race.raceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(130,199,246,0.1)',
                borderRadius: 10,
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-sans), system-ui',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'white',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {race.name}
                </p>
                {race.location && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{race.location}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {race.crewShareToken && (
                  <a
                    href={`/crew/${race.crewShareToken}`}
                    style={{
                      fontFamily: 'var(--font-geist-sans), system-ui',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      padding: '5px 12px',
                      textDecoration: 'none',
                    }}
                  >
                    View plan
                  </a>
                )}
                <button
                  onClick={() => handleCopy(race)}
                  disabled={copying === race.raceId}
                  style={{
                    fontFamily: 'var(--font-geist-sans), system-ui',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#02071E',
                    background: copying === race.raceId ? 'rgba(130,199,246,0.5)' : '#82C7F6',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 14px',
                    cursor: copying === race.raceId ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {copying === race.raceId ? 'Copying…' : 'Use this plan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
