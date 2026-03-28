import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllUsers } from '@/lib/db/users'
import { getRaceActivity } from '@/lib/db/races'
import { RaceActivityChart } from '@/components/admin/RaceActivityChart'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateEmail(email: string, max = 36) {
  return email.length > max ? email.slice(0, max - 1) + '…' : email
}

export default async function AdminPage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  const allUsers = await getAllUsers()
  const nonAdminUsers = allUsers.filter((u) => !isAdmin(u.email))
  const adminUserIds = allUsers.filter((u) => isAdmin(u.email)).map((u) => u.userId)
  const activity = await getRaceActivity(7, adminUserIds)

  const recentUsers = nonAdminUsers.slice(0, 5)
  const totalUsers = nonAdminUsers.length
  const overflow = totalUsers - 5

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">PlanUltra admin tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Race Library card */}
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

        {/* Users card */}
        <Link
          href="/admin/users"
          className="block rounded-lg border p-6 transition-colors hover:bg-[#DBF1FA] hover:border-[#82C7F6] hover:border-l-[#1D7CBE]"
        >
          <div className="text-2xl mb-2">👥</div>
          <h2 className="font-semibold text-base mb-1">Users</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Total users: {totalUsers}
          </p>

          {recentUsers.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent sign-ups</p>
              {recentUsers.map((u) => (
                <div key={u.userId} className="flex justify-between items-baseline gap-2 text-xs">
                  <span className="font-mono text-foreground truncate">{truncateEmail(u.email)}</span>
                  <span className="text-muted-foreground shrink-0">{formatDate(u.createdAt)}</span>
                </div>
              ))}
              {overflow > 0 && (
                <p className="text-xs text-muted-foreground">… and {overflow} more</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No sign-ups tracked yet — users are recorded on next login.</p>
          )}

          <div className="flex justify-end mt-4 text-[#1D7CBE] text-sm font-medium">→</div>
        </Link>

        {/* Races activity card — not clickable */}
        <div className="rounded-lg border p-6 cursor-default">
          <div className="text-2xl mb-2">🏁</div>
          <h2 className="font-semibold text-base mb-0.5">Races created</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 7 days</p>
          <RaceActivityChart days={activity} />
        </div>

      </div>
    </div>
  )
}
