import posthog from 'posthog-js'

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (!POSTHOG_KEY) return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: {
      recordCrossOriginIframes: false,
    },
  })
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.identify(userId, properties)
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.capture(event, properties)
}

export { posthog }
