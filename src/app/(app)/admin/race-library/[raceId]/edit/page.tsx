import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect, notFound } from 'next/navigation'
import { getRaceById, LIBRARY_USER_ID } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { AdminRaceForm } from '@/components/admin/AdminRaceForm'
import Link from 'next/link'

export default async function EditLibraryRacePage({
  params,
}: {
  params: Promise<{ raceId: string }>
}) {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  const { raceId } = await params
  const race = await getRaceById(LIBRARY_USER_ID, raceId)
  if (!race) notFound()

  const aidStations = await getAidStations(raceId)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/admin/race-library"
        className="text-sm text-muted-foreground hover:opacity-70 transition-opacity"
      >
        ← Race Library
      </Link>
      <AdminRaceForm race={race} initialAidStations={aidStations} />
    </div>
  )
}
