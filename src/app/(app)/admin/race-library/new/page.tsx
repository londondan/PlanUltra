import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { AdminRaceForm } from '@/components/admin/AdminRaceForm'
import Link from 'next/link'

export default async function NewLibraryRacePage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/admin/race-library"
        className="text-sm text-muted-foreground hover:opacity-70 transition-opacity"
      >
        ← Race Library
      </Link>
      <AdminRaceForm />
    </div>
  )
}
