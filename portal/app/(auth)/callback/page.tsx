'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    handleCallback()

    async function handleCallback() {
      // PKCE flow: code arrives as query parameter (?code=...)
      // Must be exchanged server-side for reliable cookie/session handling.
      // Redirect to the server-side callback route which does the exchange.
      const code = searchParams.get('code')
      if (code) {
        window.location.href = '/api/auth/callback' + window.location.search
        return
      }

      const supabase = createClient()

      // Implicit flow: tokens arrive as URL hash fragments (#access_token=...&refresh_token=...)
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('Failed to set session from implicit flow:', error.message)
            router.replace('/login?error=auth')
            return
          }
          await routeAfterLogin()
          return
        }
      }

      // No tokens and no code — something went wrong
      const errorParam = searchParams.get('error_description') || searchParams.get('error')
      console.error('OAuth callback — no tokens or code, error:', errorParam)
      router.replace('/login?error=auth')
    }

    async function routeAfterLogin() {
      try {
        const res = await fetch('/api/auth/post-login-route')
        if (res.ok) {
          const { redirectTo } = await res.json()
          if (redirectTo) {
            if (redirectTo.startsWith('/engineer') && window.location.hostname === 'partners.fractaltech.nyc') {
              window.location.href = `https://eng.fractaltech.nyc${redirectTo}`
              return
            }
            router.replace(redirectTo)
            return
          }
        }
      } catch {
        // Fall through to default
      }
      router.replace('/')
    }
  }, [searchParams, router])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Signing in...</p>
    </div>
  )
}
