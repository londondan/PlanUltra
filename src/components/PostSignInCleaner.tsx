'use client'

import { useEffect } from 'react'
import { clearGuestData } from '@/lib/guest-storage'

export function PostSignInCleaner({ isAuthenticated }: { isAuthenticated: boolean }) {
  useEffect(() => {
    if (!isAuthenticated) return
    if (document.cookie.includes('pua_guest=1')) {
      clearGuestData()
      document.cookie = 'pua_guest=1; path=/; max-age=0'
    }
  }, [isAuthenticated])
  return null
}
