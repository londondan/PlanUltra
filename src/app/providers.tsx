'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { persistAttribution } from '@/lib/marketing-attribution'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: true,
    })
  }, [])

  useEffect(() => {
    const search = typeof window === 'undefined' ? '' : window.location.search
    persistAttribution(search, pathname)
  }, [pathname])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
