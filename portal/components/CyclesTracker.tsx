'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

export default function CyclesTracker({ engineerCount }: { engineerCount: number }) {
  useEffect(() => {
    trackEvent('cycles_viewed', { engineer_count: engineerCount })
  }, [engineerCount])

  return null
}
