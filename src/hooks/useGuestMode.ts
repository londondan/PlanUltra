'use client'

import { useState, useEffect } from 'react'
import { isGuestMode } from '@/lib/guest-storage'

export function useGuestMode(): boolean {
  const [isGuest, setIsGuest] = useState(false)
  useEffect(() => {
    setIsGuest(isGuestMode())
  }, [])
  return isGuest
}
