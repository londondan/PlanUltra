import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { getLibraryRaces } from '@/lib/db/races'
import { LibraryRaceList } from '@/components/admin/LibraryRaceList'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'

export default async function RaceLibraryPage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  const races = await getLibraryRaces()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:opacity-70 transition-opacity"
          >
            ← Admin
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">Race Library</h1>
          <p className="text-sm text-muted-foreground">Manage the races available in the library</p>
        </div>
        <Link href="/admin/race-library/new" className={buttonVariants()}>
          + Add race
        </Link>
      </div>

      <LibraryRaceList initialRaces={races} />
    </div>
  )
}
