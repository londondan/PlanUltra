'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Race } from '@/lib/db/races'

interface CrewTabProps {
  race: Race
  onRaceUpdate: (updates: Partial<Race>) => void
}

export function CrewTab({ race, onRaceUpdate }: CrewTabProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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

  if (!isPublished) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share a read-only plan with your crew. Anyone with the link can see your expected arrival
          times and drop bag contents.
        </p>
        <Button onClick={handlePublish} disabled={loading}>
          {loading ? 'Publishing…' : 'Publish crew sheet'}
        </Button>
      </div>
    )
  }

  return (
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
  )
}
