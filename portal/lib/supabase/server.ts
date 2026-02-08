import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cross-subdomain cookies: eng.fractaltech.nyc and partners.fractaltech.nyc
// share Supabase cookies so PKCE code_verifier + session survive across subdomains.
const CROSS_DOMAIN_OPTS = process.env.NODE_ENV === 'production'
  ? { domain: '.fractaltech.nyc' as const } : undefined

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(CROSS_DOMAIN_OPTS && { cookieOptions: CROSS_DOMAIN_OPTS }),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
