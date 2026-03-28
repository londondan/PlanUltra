'use client'

import { useState } from 'react'
import type { UserRecord } from '@/lib/db/users'

interface Props {
  initialRows: UserRecord[]
  total: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function UserTableLoader({ initialRows, total }: Props) {
  const [rows, setRows] = useState<UserRecord[]>(initialRows)
  const [loading, setLoading] = useState(false)

  const hasMore = rows.length < total

  async function loadMore() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?offset=${rows.length}&limit=100`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json() as { users: UserRecord[] }
      setRows((prev) => [...prev, ...data.users])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground italic text-xs">
                  No users tracked yet — users are recorded on next login.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.userId} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-[#1D7CBE] font-medium hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
