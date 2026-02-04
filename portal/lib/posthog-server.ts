import { PostHog } from 'posthog-node'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null
  if (!client) {
    client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
  }
  return client
}

export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const ph = getClient()
  if (!ph) return
  ph.capture({ distinctId: userId, event, properties })
}
