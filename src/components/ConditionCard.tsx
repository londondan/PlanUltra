import React from 'react'

export type ConditionCardType =
  | 'night'
  | 'sunrise'
  | 'sunset'
  | 'weather-clear'
  | 'weather-rain'
  | 'weather-storm'
  | 'weather-snow'
  | 'weather-fog'
  | 'weather-wind'

interface ConditionCardProps {
  type: ConditionCardType
  label: string
  value: string
  subLabel?: string
  wide?: boolean
  warnSubLabel?: boolean
}

interface TypeStyle {
  background: string
  border: string
  labelColor: string
  valueColor: string
  subColor: string
  texture?: string
}

const TYPE_STYLES: Record<ConditionCardType, TypeStyle> = {
  night: {
    background: 'linear-gradient(145deg, #0a0e2a, #1a1f4e, #0d1235)',
    border: 'rgba(99,102,241,0.3)',
    labelColor: 'rgba(167,139,250,0.8)',
    valueColor: '#e2e8ff',
    subColor: 'rgba(196,181,253,0.65)',
    texture: [
      'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px) 15% 20%',
      'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px) 40% 10%',
      'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px) 70% 30%',
      'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px) 85% 15%',
      'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px) 55% 50%',
      'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px) 25% 65%',
      'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px) 90% 60%',
      'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px) 10% 80%',
      'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px) 60% 85%',
      'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px) 35% 45%',
    ].join(', '),
  },
  sunrise: {
    background: 'linear-gradient(135deg, #3b1f5c, #7c3aed, #f97316, #fbbf24)',
    border: 'rgba(249,115,22,0.3)',
    labelColor: 'rgba(254,215,170,0.9)',
    valueColor: 'white',
    subColor: 'rgba(254,243,199,0.85)',
  },
  sunset: {
    background: 'linear-gradient(145deg, #fde68a, #fb923c, #9333ea, #4c1d95)',
    border: 'rgba(147,51,234,0.3)',
    labelColor: 'rgba(233,213,255,0.9)',
    valueColor: 'white',
    subColor: 'rgba(221,214,254,0.8)',
  },
  'weather-clear': {
    background: 'linear-gradient(145deg, #eff6ff, #dbeafe, #bfdbfe)',
    border: 'rgba(96,165,250,0.4)',
    labelColor: '#1d4ed8',
    valueColor: '#1e3a8a',
    subColor: '#3b82f6',
  },
  'weather-rain': {
    background: 'linear-gradient(145deg, #f0f4f8, #cbd5e1, #94a3b8)',
    border: 'rgba(100,116,139,0.4)',
    labelColor: '#334155',
    valueColor: '#0f172a',
    subColor: '#475569',
    texture: 'repeating-linear-gradient(170deg, rgba(100,116,139,0.08) 0px, rgba(100,116,139,0.08) 1px, transparent 1px, transparent 6px)',
  },
  'weather-storm': {
    background: 'linear-gradient(145deg, #1c1917, #292524, #44403c)',
    border: 'rgba(234,179,8,0.35)',
    labelColor: 'rgba(253,224,71,0.8)',
    valueColor: '#fef08a',
    subColor: 'rgba(253,224,71,0.6)',
    texture: 'radial-gradient(ellipse at 90% 10%, rgba(253,224,71,0.15) 0%, transparent 50%)',
  },
  'weather-snow': {
    background: 'linear-gradient(145deg, #f8fafc, #e2e8f0, #cbd5e1)',
    border: 'rgba(148,163,184,0.5)',
    labelColor: '#334155',
    valueColor: '#0f172a',
    subColor: '#475569',
    texture: [
      'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px) 20% 25%',
      'radial-gradient(circle, rgba(148,163,184,0.4) 1px, transparent 1px) 50% 15%',
      'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px) 75% 40%',
      'radial-gradient(circle, rgba(148,163,184,0.3) 1px, transparent 1px) 35% 60%',
      'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px) 65% 70%',
      'radial-gradient(circle, rgba(148,163,184,0.4) 1px, transparent 1px) 88% 55%',
      'radial-gradient(circle, rgba(148,163,184,0.3) 1px, transparent 1px) 12% 80%',
    ].join(', '),
  },
  'weather-fog': {
    background: 'linear-gradient(145deg, #f1f5f9, #e2e8f0, #f8fafc, #e9edf2)',
    border: 'rgba(148,163,184,0.35)',
    labelColor: '#475569',
    valueColor: '#334155',
    subColor: '#64748b',
    texture: [
      'linear-gradient(0deg, rgba(226,232,240,0.4) 0%, transparent 20%)',
      'linear-gradient(0deg, rgba(226,232,240,0.3) 35%, transparent 55%)',
      'linear-gradient(0deg, rgba(226,232,240,0.4) 65%, transparent 85%)',
    ].join(', '),
  },
  'weather-wind': {
    background: 'linear-gradient(145deg, #ecfdf5, #d1fae5, #a7f3d0)',
    border: 'rgba(52,211,153,0.4)',
    labelColor: '#065f46',
    valueColor: '#064e3b',
    subColor: '#059669',
    texture: 'repeating-linear-gradient(8deg, rgba(52,211,153,0.07) 0px, rgba(52,211,153,0.07) 1px, transparent 1px, transparent 8px)',
  },
}

export function ConditionCard({ type, label, value, subLabel, wide, warnSubLabel }: ConditionCardProps) {
  const s = TYPE_STYLES[type]

  return (
    <div style={wide ? { gridColumn: 'span 2' } : undefined}>
      <div
        style={{
          background: s.background,
          border: `1px solid ${s.border}`,
          borderRadius: 8,
          padding: '8px 12px',
          minHeight: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {s.texture && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: s.texture,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              pointerEvents: 'none',
            }}
          />
        )}
        <div style={{ position: 'relative' }}>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.07em] mb-0.5"
            style={{ color: s.labelColor }}
          >
            {label}
          </p>
          <p
            className="font-mono text-base font-bold"
            style={{ color: s.valueColor }}
          >
            {value}
          </p>
          {subLabel && (
            <p
              className="text-xs font-mono mt-0.5"
              style={{ color: warnSubLabel ? '#f59e0b' : s.subColor }}
            >
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
