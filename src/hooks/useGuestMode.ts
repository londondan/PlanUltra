'use client'

import { useState, useEffect } from 'react'
import { isGuestMode } from '@/lib/guest-storage'

export function useGuestMode(): boolean {
  const [isGuest, setIsGuest] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsGuest(isGuestMode())
  }, [])
  return isGuest
}
