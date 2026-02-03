'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

export default function HiringSpaTracker({ profileStatus }: { profileStatus: string | null }) {
  useEffect(() => {
    trackEvent('hiring_spa_viewed', { profile_status: profileStatus })
  }, [profileStatus])

  return null
}
