'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog, POSTHOG_KEY } from '@/lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (!POSTHOG_KEY) return
    if (pathname) {
      try {
        let url = window.origin + pathname
        if (searchParams?.toString()) {
          url = url + '?' + searchParams.toString()
        }
        posthog.capture('$pageview', { $current_url: url })
      } catch {
        // Silently fail if blocked by ad blocker / privacy extension
      }
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
