'use client'

import { useRouter } from 'next/navigation'
import { activateGuestMode } from '@/lib/guest-storage'

export function GuestEntryLink() {
  const router = useRouter()
  return (
    <button
      onClick={() => {
        activateGuestMode()
        router.push('/dashboard')
      }}
      className="text-sm"
      style={{ color: "var(--sky)", opacity: 0.85 }}
    >
      Try it without an account →
    </button>
  )
}
