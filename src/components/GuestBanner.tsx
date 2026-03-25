'use client'

import { useGuestMode } from '@/hooks/useGuestMode'

export function GuestBanner() {
  const isGuest = useGuestMode()
  if (!isGuest) return null
  return (
    <div className="w-full bg-amber-100 border-b border-amber-400 text-amber-900 flex items-center justify-center gap-2 h-10 text-sm">
      You&apos;re in guest mode — <strong>your data isn&apos;t being saved to the cloud.</strong>
      <a href="/auth/signin" className="font-semibold underline">
        Create a free account →
      </a>
    </div>
  )
}
