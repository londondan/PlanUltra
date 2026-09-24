'use client'

import { useState, useEffect } from 'react'

interface Props {
  shareToken: string
}

export function CrewPlanActions({ shareToken }: Props) {
  const [editKey, setEditKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('planultra_plans')
      if (!raw) return
      const plans = JSON.parse(raw) as Array<{ shareToken: string; editKey: string }>
      const match = plans.find((p) => p.shareToken === shareToken)
      if (match) setEditKey(match.editKey)
    } catch {
      // localStorage unavailable
    }
  }, [shareToken])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/crew/${shareToken}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select URL bar
    }
  }

  return (
    <div
      className="print-hide"
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 24px',
        background: '#02071E',
        borderTop: '1px solid rgba(130,199,246,0.1)',
      }}
    >
      <button
        onClick={handleCopy}
        style={{
          fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
          fontSize: 12,
          color: copied ? '#82C7F6' : 'rgba(255,255,255,0.55)',
          background: 'none',
          border: '1px solid rgba(130,199,246,0.25)',
          borderRadius: 6,
          padding: '5px 14px',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        {copied ? '✓ Link copied' : 'Copy share link'}
      </button>

      {editKey && (
        <a
          href={`/crew/${shareToken}/edit/${editKey}/stations`}
          style={{
            fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
            fontSize: 12,
            color: '#82C7F6',
            background: 'none',
            border: '1px solid rgba(130,199,246,0.35)',
            borderRadius: 6,
            padding: '5px 14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Edit plan
        </a>
      )}
    </div>
  )
}
