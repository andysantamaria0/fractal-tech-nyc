import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Cross-subdomain cookies: eng.fractaltech.nyc and partners.fractaltech.nyc
  // share Supabase cookies so PKCE code_verifier + session survive across subdomains.
  const useParentDomain =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.fractaltech.nyc')

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    useParentDomain ? { cookieOptions: { domain: '.fractaltech.nyc' } } : undefined
  )
}
