import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getAllUsers } from '@/lib/db/users'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)))

  const allUsers = await getAllUsers()
  const nonAdminUsers = allUsers.filter((u) => !isAdmin(u.email))
  const total = nonAdminUsers.length
  const users = nonAdminUsers.slice(offset, offset + limit)

  return NextResponse.json({ total, users })
}
