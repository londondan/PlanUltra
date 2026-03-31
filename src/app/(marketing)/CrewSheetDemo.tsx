'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

const STATION1_MAPS_URL = 'https://maps.google.com/?q=38.3547324,-79.0864161'
const STATION2_MAPS_URL = 'https://maps.google.com/?q=38.3646,-79.16292'
const STATION1_DIRECTIONS = 'https://www.google.com/maps/place/94+Natural+Chimneys+Ln,+Mt+Solon,+VA+22843/@38.3547324,-79.088991,17z'
const STATION2_DIRECTIONS = 'https://www.google.com/maps/place/38%C2%B021%2752.6%22N+79%C2%B009%2746.5%22W/@38.3646,-79.1654949,17z'

const QR_OPTS = { type: 'svg' as const, color: { dark: '#114574', light: '#ffffff' }, margin: 1, width: 62 }

function ParkingBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 11, fontWeight: 600,
      color: '#114574', background: 'rgba(29,124,190,0.08)',
      border: '1px solid rgba(130,199,246,0.35)', borderRadius: 5, padding: '3px 9px',
    }}>
      {icon} {label}
    </span>
  )
}

function ConditionChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, color: '#1e3a5f',
      background: 'rgba(17,69,116,0.08)', border: '1px solid rgba(130,199,246,0.3)',
      borderRadius: 20, padding: '2px 10px',
    }}>
      🌙 {label}
    </span>
  )
}

function DirectionsLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 600, color: '#1D7CBE',
        textDecoration: 'none', padding: '5px 10px',
        border: '1px solid rgba(130,199,246,0.4)', borderRadius: 6,
        background: 'rgba(29,124,190,0.04)',
      }}
    >
      📍 Directions to crew parking
    </a>
  )
}

function CrewNotesBlock({ text }: { text: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 7,
      background: '#fffbeb', border: '1px solid #fde68a',
      fontSize: 12, color: '#92400e', lineHeight: 1.55,
    }}>
      <span style={{ fontWeight: 700, marginRight: 4 }}>Crew notes:</span>{text}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '8px 0', borderTop: '1px solid rgba(130,199,246,0.18)',
      fontSize: 12,
    }}>
      <span style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 10, fontWeight: 700, color: '#114574', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 68, paddingTop: 1 }}>{label}</span>
      <span style={{ color: '#02071E', lineHeight: 1.5 }}>{value}</span>
    </div>
  )
}

export function CrewSheetDemo() {
  const [qrSvgs, setQrSvgs] = useState<{ s1: string; s2: string } | null>(null)

  useEffect(() => {
    Promise.all([
      QRCode.toString(STATION1_MAPS_URL, QR_OPTS),
      QRCode.toString(STATION2_MAPS_URL, QR_OPTS),
    ]).then(([s1, s2]) => setQrSvgs({ s1, s2 }))
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      {/* Scrollable demo container */}
      <div style={{
        maxHeight: 720,
        overflowY: 'auto',
        border: '1px solid rgba(130,199,246,0.35)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(17,69,116,0.10), 0 2px 8px rgba(17,69,116,0.06)',
        background: 'white',
        fontFamily: 'var(--font-geist-sans, system-ui)',
      }}>

        {/* ── Sheet header ── */}
        <div style={{
          background: '#02071E', padding: '20px 24px 18px',
          borderBottom: '1px solid rgba(130,199,246,0.15)',
        }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans, system-ui)',
            fontSize: 18, fontWeight: 800, color: 'white',
            letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4,
          }}>
            2025 Grindstone 100
          </div>
          <div style={{ fontSize: 12, color: 'rgba(130,199,246,0.75)', marginBottom: 10 }}>
            Crew sheet for Daniel James · Friday, October 3
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['10 crew stations', '~36h target', 'Est. finish Sun 6:00 AM'].map(stat => (
              <span key={stat} style={{
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: 11, color: 'rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, padding: '2px 8px',
              }}>{stat}</span>
            ))}
          </div>
        </div>

        {/* ── Station 1 — Start / Finish ── */}
        <div style={{
          border: '1px solid rgba(130,199,246,0.55)', borderRadius: 10,
          margin: '16px 16px 0', overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(29,124,190,0.06)',
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '12px 16px', background: 'rgba(219,241,250,0.25)',
            borderBottom: '1px solid rgba(130,199,246,0.3)',
          }}>
            <span style={{
              fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 11, fontWeight: 700,
              background: '#114574', color: 'white', padding: '3px 8px', borderRadius: 5,
            }}>MI 0.0</span>
            <span style={{ fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 14, fontWeight: 800, color: '#02071E', flex: 1 }}>
              Start / Finish
            </span>
            <ConditionChip label="Night start" />
            <span style={{ fontSize: 12, color: '#64748b' }}>ETA 6:00 PM</span>
          </div>

          {/* Location block */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(130,199,246,0.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ParkingBadge icon="🅿" label="Parking lot" />
              <DirectionsLink href={STATION1_DIRECTIONS} />
            </div>
            {qrSvgs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{ width: 62, height: 62, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(130,199,246,0.3)', flexShrink: 0 }}
                  dangerouslySetInnerHTML={{ __html: qrSvgs.s1 }}
                />
                <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>Scan to open<br />in Google Maps</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <CrewNotesBlock text="Make sure I changed my batteries before the start. Check that I have all my mandatory equipment. Wish me luck!" />
            <DataRow label="Gear" value="Headlamp, Poles, Warm layer" />
            <DataRow label="Nutrition" value="10× drink mix · ~99 kcal" />
            <DataRow label="Supplies" value="10 gels, 12 snacks (fruit snacks, gummies, etc.)" />
          </div>
        </div>

        {/* ── Bridge ── */}
        <div style={{
          margin: '0 16px', padding: '14px 16px',
          borderLeft: '2px solid rgba(130,199,246,0.3)',
          marginLeft: 32,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1D7CBE', marginBottom: 8 }}>
            🚗 11 min · 4.9 mi drive → North River Gap Aid Station #5 &amp; #14
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { mile: '5.7',  name: 'Lick Run Aid Station #1 & #15',  eta: '7:30 PM' },
              { mile: '11.5', name: 'Wolf Ridge Aid Station #2',       eta: '9:07 PM' },
              { mile: '20.4', name: 'Reddish Knob Aid Station #3',     eta: '12:04 AM' },
              { mile: '24.3', name: 'Little Bald Aid Station #4',      eta: '1:10 AM' },
            ].map(cp => (
              <div key={cp.mile} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 10, color: '#94a3b8', minWidth: 36 }}>mi {cp.mile}</span>
                <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>{cp.name}</span>
                <span style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{cp.eta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Station 2 — North River Gap ── */}
        <div style={{
          border: '1px solid rgba(130,199,246,0.55)', borderRadius: 10,
          margin: '0 16px 16px', overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(29,124,190,0.06)',
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '12px 16px', background: 'rgba(219,241,250,0.25)',
            borderBottom: '1px solid rgba(130,199,246,0.3)',
          }}>
            <span style={{
              fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 11, fontWeight: 700,
              background: '#114574', color: 'white', padding: '3px 8px', borderRadius: 5,
            }}>MI 32.9</span>
            <span style={{ fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 13, fontWeight: 800, color: '#02071E', flex: 1 }}>
              North River Gap Aid Station #5 &amp; #14
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ETA 3:46 AM</span>
          </div>

          {/* Location block */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(130,199,246,0.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ParkingBadge icon="🥾" label="Trailhead" />
              <DirectionsLink href={STATION2_DIRECTIONS} />
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Walking access to Aid Station is 300 meters after leaving camp entrance and to your left.
            </div>
            {qrSvgs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{ width: 62, height: 62, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(130,199,246,0.3)', flexShrink: 0 }}
                  dangerouslySetInnerHTML={{ __html: qrSvgs.s2 }}
                />
                <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>Scan to open<br />in Google Maps</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <CrewNotesBlock text="I'll be fresh coming in here, I don't plan to stop for very long. Keep the stop under 5 minutes — check my headlamp battery status and make sure my knee is feeling fine." />
            <DataRow label="Nutrition" value="4× drink mix · ~1,093 kcal" />
            <DataRow label="Supplies" value="4 gels, 4 snacks" />
          </div>
        </div>

        {/* ── Trailing indicator ── */}
        <div style={{
          padding: '12px 24px 20px',
          textAlign: 'center',
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: 11, color: 'rgba(17,69,116,0.4)',
        }}>
          + 8 more crew stations · Generated by PlanUltra
        </div>
      </div>

      {/* Fade overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
        background: 'linear-gradient(to bottom, transparent, white)',
        borderRadius: '0 0 16px 16px',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
