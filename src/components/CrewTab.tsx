'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, ExternalLink, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Race } from '@/lib/db/races'
import type { AidStation } from '@/types/gpx'
import type { Coordinates } from '@/lib/maps'

const KM_TO_MI = 0.621371

type ParkingType = 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off'

const PARKING_OPTIONS: { value: ParkingType; icon: string; label: string; desc: string }[] = [
  { value: 'parking-lot',   icon: '🅿',  label: 'Parking lot',    desc: 'Designated lot' },
  { value: 'side-of-road',  icon: '🛣',  label: 'Side of road',   desc: 'Roadside pull-off' },
  { value: 'trailhead',     icon: '🥾',  label: 'Trailhead',      desc: 'Trailhead parking area' },
  { value: 'drop-off',      icon: '🚗',  label: 'Drop-off only',  desc: 'Brief stop, no parking' },
]

function getResolveErrorMessage(reason?: string): string {
  if (reason === 'coords_not_found') {
    return "We couldn't extract coordinates from that Google Maps link. Try a fuller Maps link or enter lat,lng directly."
  }
  if (reason === 'unresolvable_short_link') {
    return "Couldn't resolve that link right now. Try again or enter lat,lng directly."
  }
  return 'Invalid format. Use a Google Maps link or enter lat,lng directly.'
}

// ─── Location & Parking sub-panel ────────────────────────────────────────────

interface LocationPanelProps {
  station: AidStation
  raceId: string
  onSave: (order: number, updates: Partial<AidStation>) => Promise<void>
  onChange?: (updates: Partial<AidStation>) => void
}

export function LocationPanel({ station, raceId: _raceId, onSave, onChange }: LocationPanelProps) {
  const [coords, setCoords] = useState(station.crewParkingCoords ?? null)
  const [parkingType, setParkingType] = useState<ParkingType | null>(station.crewParkingType ?? null)
  const [notes, setNotes] = useState(station.crewLocationNotes ?? '')
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [changing, setChanging] = useState(false)
  const [open, setOpen] = useState(() => !!(station.crewParkingCoords))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if parent updates (e.g. after save)
  useEffect(() => {
    setCoords(station.crewParkingCoords ?? null)
    setParkingType(station.crewParkingType ?? null)
    setNotes(station.crewLocationNotes ?? '')
  }, [station.crewParkingCoords, station.crewParkingType, station.crewLocationNotes])

  const statusLabel = !coords
    ? 'Not set'
    : parkingType
      ? `✓ Set · ${PARKING_OPTIONS.find(o => o.value === parkingType)?.icon ?? ''} ${PARKING_OPTIONS.find(o => o.value === parkingType)?.label ?? ''}`
      : '✓ Location set'
  const isSet = !!coords

  const handleSetLocation = async () => {
    setInputError('')
    setResolving(true)
    try {
      const res = await fetch('/api/maps/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputValue }),
      })

      const data = await res.json() as
        | { success: true; coords: Coordinates }
        | { success: false; reason?: string; error?: string }

      if (!res.ok) {
        setInputError("Couldn't resolve that link right now. Try again or enter lat,lng directly.")
        return
      }

      if (!data.success) {
        setInputError(data.error ?? getResolveErrorMessage(data.reason))
        return
      }

      setCoords(data.coords)
      setChanging(false)
      setInputValue('')
      if (onChange) {
        onChange({ crewParkingCoords: data.coords })
      } else {
        await onSave(station.order, { crewParkingCoords: data.coords })
      }
    } catch {
      setInputError("Couldn't resolve that link right now. Try again or enter lat,lng directly.")
      return
    } finally {
      setResolving(false)
    }
  }

  const handleParkingTypeChange = async (val: ParkingType) => {
    setParkingType(val)
    if (onChange) {
      onChange({ crewParkingType: val })
    } else {
      await onSave(station.order, { crewParkingType: val })
    }
  }

  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (onChange) {
        onChange({ crewLocationNotes: val })
      } else {
        onSave(station.order, { crewLocationNotes: val })
      }
    }, 600)
  }

  const handleChangeLocation = () => {
    setInputValue(coords ? `${coords.lat},${coords.lng}` : '')
    setInputError('')
    setChanging(true)
  }

  return (
    <div style={{ borderTop: '1px solid rgba(130,199,246,0.25)' }}>
      {/* Sub-section header */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 text-left"
        style={{ padding: '10px 16px', background: open ? '#fafcfe' : 'white', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#114574', letterSpacing: '0.01em' }}>
            Location &amp; Parking
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: 11,
            color: isSet ? '#15803d' : '#94a3b8',
            fontWeight: isSet ? 600 : 400,
          }}>
            {statusLabel}
          </span>
          <ChevronDown
            className="size-3 text-muted-foreground transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#94a3b8' }}
          />
        </div>
      </button>

      {open && (
        <div style={{
          padding: '14px 16px 16px',
          background: '#fafcfe',
          borderTop: '1px solid rgba(130,199,246,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>

          {/* State banner */}
          {!coords && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 7,
              background: '#fffbeb', border: '1px solid #fde68a',
              color: '#92400e', fontSize: 12, lineHeight: 1.45,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
              <div>Add a location so crew can get directions and a QR code appears on the crew sheet. <strong>Tip:</strong> open Google Maps, find the parking area, and paste the link.</div>
            </div>
          )}
          {coords && !changing && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 7,
              background: 'rgba(219,241,250,0.5)', border: '1px solid rgba(130,199,246,0.4)',
              color: '#114574', fontSize: 12, lineHeight: 1.45,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <div>Location set. Consider adding location notes to help crew find the exact spot once they&apos;re parked.</div>
            </div>
          )}

          {/* Google Maps location field */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 5 }}>
              Google Maps Location
            </label>

            {coords && !changing ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 11px',
                background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6,
                fontSize: 12,
              }}>
                <span style={{ fontSize: 13 }}>📍</span>
                <span style={{ flex: 1, color: '#15803d', fontWeight: 600 }}>Location set</span>
                <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: '#166534' }}>
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={handleChangeLocation}
                  style={{
                    background: 'none', border: '1px solid #86efac', borderRadius: 5,
                    padding: '3px 8px', fontSize: 11, color: '#166534', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setInputError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSetLocation() }}
                    placeholder="Paste a Google Maps link or enter lat, lng…"
                    style={{
                      flex: 1, background: 'white', border: `1px solid ${inputError ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: 6, padding: '8px 11px', fontSize: 13, color: '#02071E',
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSetLocation}
                    disabled={resolving}
                    style={{
                      background: '#1D7CBE', color: 'white', border: 'none',
                      borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600,
                      cursor: resolving ? 'wait' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      opacity: resolving ? 0.8 : 1,
                    }}
                  >
                    {resolving ? 'Resolving...' : '📍 Set'}
                  </button>
                </div>
                {inputError && (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{inputError}</p>
                )}
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 }}>
                  e.g. https://maps.google.com/?q=41.7442,-111.8413 · or paste a short maps.app.goo.gl link
                </p>
              </>
            )}
          </div>

          {/* Parking type */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 5 }}>
              Parking type <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {PARKING_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 12px',
                    background: parkingType === opt.value ? 'rgba(219,241,250,0.5)' : 'white',
                    border: `1.5px solid ${parkingType === opt.value ? '#1D7CBE' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                  } as React.CSSProperties}
                >
                  <input
                    type="radio"
                    name={`parking-${station.order}`}
                    value={opt.value}
                    checked={parkingType === opt.value}
                    onChange={() => handleParkingTypeChange(opt.value)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `2px solid ${parkingType === opt.value ? '#1D7CBE' : '#cbd5e1'}`,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {parkingType === opt.value && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D7CBE' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#02071E' }}>
                      <span style={{ marginRight: 4 }}>{opt.icon}</span>{opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: parkingType === opt.value ? '#114574' : '#94a3b8' }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Location notes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 5 }}>
              Location notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              maxLength={500}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="e.g. Park in the main lot on 6th Ave. After parking, walk 300 yards north on the trail to the aid station — look for the orange flags."
              style={{
                width: '100%', minHeight: 72, resize: 'vertical',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
                padding: '8px 11px', fontSize: 13, color: '#02071E', lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 3 }}>
              {notes.length} / 500
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
              Shown on the crew sheet below the directions link. Use this for anything the location pin can&apos;t convey.
            </p>
          </div>

          {/* Preview strip (when coords set) */}
          {coords && !changing && (
            <div style={{ border: '1px solid rgba(130,199,246,0.4)', borderRadius: 8, overflow: 'hidden', marginTop: 2 }}>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(219,241,250,0.4)',
                borderBottom: '1px solid rgba(130,199,246,0.3)',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#1D7CBE',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                👁 Preview — crew sheet
              </div>
              <div style={{ padding: '10px 12px', background: 'white', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, color: '#1D7CBE',
                    background: 'white', border: '1px solid rgba(29,124,190,0.35)',
                    borderRadius: 6, padding: '4px 10px', width: 'fit-content',
                  }}>
                    📍 Directions to crew parking
                  </span>
                  {notes.trim() ? (
                    <div style={{
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.9)',
                      borderLeft: '3px solid #82C7F6',
                      borderRadius: '0 5px 5px 0',
                      fontSize: 11, color: '#114574', lineHeight: 1.4,
                    }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1D7CBE', opacity: 0.75, marginBottom: 1 }}>
                        Location notes
                      </div>
                      {notes}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                      No location notes yet
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 56, height: 56,
                    border: '1.5px solid rgba(130,199,246,0.55)', borderRadius: 6,
                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#94a3b8', textAlign: 'center',
                  }}>
                    QR
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, textTransform: 'uppercase', color: 'rgba(17,69,116,0.45)', textAlign: 'center', lineHeight: 1.3 }}>
                    Scan for<br />directions
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── Station card ─────────────────────────────────────────────────────────────

interface StationCardProps {
  station: AidStation
  allCrewStations: AidStation[]
  raceId: string
  onSave: (order: number, updates: Partial<AidStation>) => Promise<void>
}

function CrewStationCardEdit({ station, allCrewStations, raceId, onSave }: StationCardProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const physicalKey = station.physicalName ?? station.name
  const visitMiles = allCrewStations
    .filter(s => (s.physicalName ?? s.name) === physicalKey)
    .map(s => (s.distanceFromStart * KM_TO_MI).toFixed(1))
  const mileBadge = visitMiles.join(' & ')

  return (
    <div className="rounded-lg border border-[rgba(130,199,246,0.55)] bg-card overflow-hidden shadow-[0_2px_6px_rgba(29,124,190,0.06)]">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={open ? { background: 'var(--mist)', borderBottom: '1px solid rgba(130,199,246,0.4)' }
          : hovered ? { backgroundColor: 'var(--secondary)' } : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 11, fontWeight: 700,
          background: '#114574', color: 'white',
          padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          MI {mileBadge}
        </span>
        {visitMiles.length > 1 && (
          <span style={{
            fontSize: 10, color: '#1D7CBE', fontWeight: 500,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {visitMiles.length} visits
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-sm font-bold truncate">{station.name}</p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: '#15803d',
          background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 5, padding: '2px 8px', fontWeight: 600, flexShrink: 0,
        }}>
          ✓ Crew
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div>
          <LocationPanel station={station} raceId={raceId} onSave={onSave} />
        </div>
      )}
    </div>
  )
}

// ─── Main CrewTab ─────────────────────────────────────────────────────────────

interface CrewTabProps {
  race: Race
  aidStations: AidStation[]
  raceId: string
  onRaceUpdate: (updates: Partial<Race>) => void
  onAidStationUpdate?: (order: number, updates: Partial<AidStation>) => void
  isGuest?: boolean
}

export function CrewTab({ race, aidStations, raceId, onRaceUpdate, onAidStationUpdate, isGuest }: CrewTabProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [localStations, setLocalStations] = useState<AidStation[]>(aidStations)

  // Keep local copy in sync when parent updates aidStations
  useEffect(() => {
    setLocalStations(aidStations)
  }, [aidStations])

  const isPublished = Boolean(race.crewShareToken)
  const shareUrl = isPublished
    ? `${window.location.origin}/crew/${race.crewShareToken}`
    : null

  const handlePublish = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/races/${race.raceId}/publish`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        onRaceUpdate({ crewShareToken: data.crewShareToken, crewPublishedAt: data.crewPublishedAt })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnpublish = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/races/${race.raceId}/publish`, { method: 'DELETE' })
      if (res.ok) {
        onRaceUpdate({ crewShareToken: undefined, crewPublishedAt: undefined })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStationSave = async (order: number, updates: Partial<AidStation>): Promise<void> => {
    await fetch(`/api/races/${raceId}/aid-stations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, updates }),
    })
    // Sync location fields to all stations sharing the same physicalName
    const locationKeys: (keyof AidStation)[] = ['crewParkingCoords', 'crewParkingType', 'crewLocationNotes']
    const hasLocationUpdate = locationKeys.some(k => k in updates)
    setLocalStations(prev => {
      const target = prev.find(s => s.order === order)
      const physicalKey = target ? (target.physicalName ?? target.name) : null
      return prev.map(s => {
        if (s.order === order) return { ...s, ...updates }
        if (hasLocationUpdate && physicalKey && (s.physicalName ?? s.name) === physicalKey) {
          const locationUpdates = Object.fromEntries(
            locationKeys.filter(k => k in updates).map(k => [k, updates[k]])
          ) as Partial<AidStation>
          return { ...s, ...locationUpdates }
        }
        return s
      })
    })
    onAidStationUpdate?.(order, updates)
  }

  const crewStations = localStations.filter(s => s.hasCrewAccess && !s.isFinish)

  const seenPhysical = new Set<string>()
  const uniqueCrewStations = crewStations.filter(s => {
    const key = s.physicalName ?? s.name
    if (seenPhysical.has(key)) return false
    seenPhysical.add(key)
    return true
  })

  if (isGuest) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Crew sheet sharing requires an account.
        </p>
        <Button disabled>Publish crew sheet</Button>
        <p className="text-xs">
          <a href="/auth/signin" className="underline">Create a free account →</a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Publish / share section */}
      {!isPublished ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share a read-only plan with your crew. Anyone with the link can see your expected arrival
            times and drop bag contents.
          </p>
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? 'Publishing…' : 'Publish crew sheet'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Public crew URL</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl ?? ''}
                className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono"
              />
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <a
                href={shareUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <ExternalLink className="size-4" />
                View
              </a>
            </div>
          </div>

          {race.crewPublishedAt && (
            <p className="text-xs text-muted-foreground">
              Last published:{' '}
              {new Date(race.crewPublishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}

          <Button variant="outline" onClick={handleUnpublish} disabled={loading}>
            {loading ? 'Unpublishing…' : 'Unpublish'}
          </Button>
        </div>
      )}

      {/* Crew stations — Location & Parking */}
      {crewStations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Crew stations</p>
            <div className="flex-1 h-px bg-[rgba(130,199,246,0.4)]" />
          </div>
          <p className="text-xs text-muted-foreground">
            Add parking locations so your crew gets directions and a QR code on their printed sheet.
          </p>
          <div className="space-y-2 mt-2">
            {uniqueCrewStations.map(station => (
              <CrewStationCardEdit
                key={station.order}
                station={station}
                allCrewStations={crewStations}
                raceId={raceId}
                onSave={handleStationSave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
