import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRacesByUser } from '@/lib/db/races'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { RaceList } from '@/components/RaceList'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const races = await getRacesByUser(session.user.id).catch(() => [])

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

      {races.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary p-12 text-center">
          <h3 className="text-lg font-semibold">No races yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload a GPX file or select from our curated race library to get started.
          </p>
          <Link href="/dashboard/new" className={buttonVariants()}>
            Add your first race
          </Link>
        </div>
      ) : (
        <RaceList initialRaces={races} />
      )}
    </div>
  )
}
