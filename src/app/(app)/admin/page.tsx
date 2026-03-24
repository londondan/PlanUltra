import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">PlanUltra admin tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/race-library"
          className="block rounded-lg border p-6 transition-colors hover:bg-[#DBF1FA] hover:border-[#82C7F6] hover:border-l-[#1D7CBE]"
        >
          <div className="text-2xl mb-2">📚</div>
          <h2 className="font-semibold text-base mb-1">Race Library</h2>
          <p className="text-sm text-muted-foreground">
            Manage the curated race library that users can pick from when adding a new race.
          </p>
        </Link>
      </div>
    </div>
  )
}
