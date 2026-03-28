import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllUsers } from '@/lib/db/users'
import { UserTableLoader } from './UserTableLoader'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) redirect('/dashboard')

  const allUsers = await getAllUsers()
  const nonAdminUsers = allUsers.filter((u) => !isAdmin(u.email))
  const initialRows = nonAdminUsers.slice(0, 100)
  const total = nonAdminUsers.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-[#1D7CBE] hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">All registered accounts</p>

      <p className="text-sm text-muted-foreground">Total: {total} {total === 1 ? 'user' : 'users'}</p>

      <UserTableLoader initialRows={initialRows} total={total} />
    </div>
  )
}
