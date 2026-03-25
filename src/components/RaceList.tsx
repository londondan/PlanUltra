'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteGuestRace } from '@/lib/guest-storage'
import type { Race } from '@/lib/db/races'

interface RaceListProps {
  initialRaces: Race[]
  isGuest?: boolean
}

export function RaceList({ initialRaces, isGuest }: RaceListProps) {
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
      if (isGuest) {
        deleteGuestRace(pendingDelete.raceId)
        setRaces((prev) => prev.filter((r) => r.raceId !== pendingDelete.raceId))
        setPendingDelete(null)
        return
      }
      const res = await fetch(`/api/races/${pendingDelete.raceId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRaces((prev) => prev.filter((r) => r.raceId !== pendingDelete.raceId))
      setPendingDelete(null)
      router.refresh()
    } catch {
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => (
          <Card
            key={race.raceId}
            className="cursor-pointer hover:bg-[#DBF1FA] hover:border-[#82C7F6] hover:border-l-[#1D7CBE] hover:shadow-[0_4px_16px_rgba(29,124,190,0.12)] hover:-translate-y-0.5"
            onClick={() => router.push(`/dashboard/${race.raceId}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{race.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{race.timezone}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Race options"
                    >
                      ⋮
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/${race.raceId}`)}>
                        View race
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setPendingDelete(race)
                          setDeleteError(null)
                        }}
                      >
                        Delete race…
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardDescription>
                {new Date(race.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Start: {race.startTime}</p>
            </CardContent>
          </Card>
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
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the race and all its aid stations. This cannot be undone.
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
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
