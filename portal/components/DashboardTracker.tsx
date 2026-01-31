'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

export default function DashboardTracker() {
  useEffect(() => {
    trackEvent('dashboard_viewed')
  }, [])

  return null
}
