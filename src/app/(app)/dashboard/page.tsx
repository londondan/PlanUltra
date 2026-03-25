'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { RaceList } from '@/components/RaceList'
import { isGuestMode, getGuestRaces } from '@/lib/guest-storage'
import type { Race } from '@/lib/db/races'
import { track } from '@vercel/analytics'

export default function DashboardPage() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    if (isGuestMode()) {
      setRaces(getGuestRaces())
      setLoading(false)
    } else {
      fetch('/api/races')
        .then((r) => r.json())
        .then((d) => {
          setRaces(d.races ?? [])
          setLoading(false)
          if (d.races?.length === 0) {
            if (!localStorage.getItem('pu_signup_tracked')) {
              const source = new URLSearchParams(window.location.search).get('utm_source') ?? 'direct'
              track('signup', { source })
              localStorage.setItem('pu_signup_tracked', '1')
            }
          }
        })
        .catch(() => setLoading(false))
    }
  }, [mounted])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Races</h1>
          <p className="text-muted-foreground">Plan and manage your ultra marathon races</p>
        </div>
        <Link href="/dashboard/new" className={buttonVariants()}>
          Add race
        </Link>
      </div>

      {!loading && races.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary p-12 text-center">
          <h3 className="text-lg font-semibold">No races yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload a GPX file or select from our curated race library to get started.
          </p>
          <Link href="/dashboard/new" className={buttonVariants()}>
            Add your first race
          </Link>
        </div>
      )}

      {!loading && races.length > 0 && (
        <RaceList initialRaces={races} isGuest={mounted && isGuestMode()} />
      )}
    </div>
  )
}
