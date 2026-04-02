'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Race } from '@/lib/db/races'

interface LibraryRaceListProps {
  initialRaces: Race[]
}

export function LibraryRaceList({ initialRaces }: LibraryRaceListProps) {
  const router = useRouter()
  const [races, setRaces] = useState<Race[]>(initialRaces)
  const [pendingDelete, setPendingDelete] = useState<Race | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/races/${pendingDelete.raceId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }
      setRaces((prev) => prev.filter((r) => r.raceId !== pendingDelete.raceId))
      setPendingDelete(null)
      router.refresh()
    } catch {
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (races.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground mb-4">
          No races in the library yet. Add the first one to get started.
        </p>
        <Button onClick={() => router.push('/admin/race-library/new')}>+ Add race</Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {races.map((race) => (
          <div
            key={race.raceId}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-bold text-base">{race.name}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(race.date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {race.location && ` · ${race.location}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/race-library/${race.raceId}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingDelete(race)
                  setDeleteError(null)
                }}
                aria-label={`Delete ${race.name}`}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This will permanently remove the race from the library. Users who have already added
              it to their dashboard will not be affected.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDelete(null)
                setDeleteError(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete race'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
