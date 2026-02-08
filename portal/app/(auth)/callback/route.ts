import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'

  // Validate redirect target to prevent open redirects
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    // Buffer cookies so we can apply them to the redirect response directly.
    // Relying solely on cookieStore.set() can silently fail to attach cookies
    // to NextResponse.redirect(), causing the session to be lost on redirect.
    const cookieBuffer: { name: string; value: string; options?: Record<string, unknown> }[] = []

    // Cross-subdomain cookies so PKCE code_verifier (set on eng.) is readable here
    const crossDomainOpts = process.env.NODE_ENV === 'production'
      ? { domain: '.fractaltech.nyc' as const } : undefined

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        ...(crossDomainOpts && { cookieOptions: crossDomainOpts }),
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieBuffer.push({ name, value, options })
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Ignore — called from Server Component
              }
            })
          },
        },
      }
    )

    // Check engineer flow cookie BEFORE exchange — it's on .fractaltech.nyc
    // so it's available here even when Supabase redirected to partners subdomain.
    const isEngineerFlow = cookieStore.get('x-engineer-flow')?.value === '1'

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth code exchange failed:', error.message, error)
      // PKCE code_verifier lives in browser cookies — if the magic link opened
      // in a different browser, the exchange fails. Redirect engineers back to
      // their login page (not the company login page).
      if (isEngineerFlow) {
        return NextResponse.redirect(`https://eng.fractaltech.nyc/engineer/login?error=link`)
      }
    }

    if (!error) {
      let redirectPath = next

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Use service client to check engineer tables (bypasses RLS)
        const serviceClient = createSupabaseJsClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )

        // Check engineers table by auth_user_id first, then email
        let engineer: { id: string; auth_user_id: string | null; status: string } | null = null
        const { data: byAuthId } = await serviceClient
          .from('engineers')
          .select('id, auth_user_id, status')
          .eq('auth_user_id', user.id)
          .limit(1)
          .maybeSingle()
        engineer = byAuthId
        if (!engineer && user.email) {
          const { data: byEmail } = await serviceClient
            .from('engineers')
            .select('id, auth_user_id, status')
            .ilike('email', user.email)
            .limit(1)
            .maybeSingle()
          engineer = byEmail
        }

        // Server-side intent: survives across browsers (unlike cookies).
        // Set by /api/engineer/mark-flow when magic link is sent.
        let hasLoginIntent = false
        if (user.email) {
          const { data: intent } = await serviceClient
            .from('engineer_login_intents')
            .select('email')
            .eq('email', user.email.toLowerCase())
            .maybeSingle()
          hasLoginIntent = !!intent
        }

        if (engineer) {
          // Link auth_user_id if not already set
          if (!engineer.auth_user_id) {
            await serviceClient
              .from('engineers')
              .update({ auth_user_id: user.id })
              .eq('id', engineer.id)
          }
          if (engineer.auth_user_id && engineer.status !== 'draft') {
            redirectPath = '/engineer/dashboard'
          } else {
            redirectPath = '/engineer/onboard'
          }
        } else if (hasLoginIntent || isEngineerFlow || next.startsWith('/engineer')) {
          // Engineer flow confirmed by: DB intent (cross-browser), cookie (same-browser), or query param
          // Create a draft engineer record so the admin dashboard can see them immediately.
          // Best-effort: duplicate auth_user_id/email returns error (not thrown), safely ignored.
          if (user.email) {
            await serviceClient
              .from('engineers')
              .insert({
                auth_user_id: user.id,
                email: user.email,
                name: user.email.split('@')[0],
                status: 'draft',
              })
          }
          redirectPath = '/engineer/onboard'
        } else {
          // No engineer signals at all — check company profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            redirectPath = next
          } else {
            // No record anywhere — safe default to engineer onboard
            redirectPath = '/engineer/onboard'
          }
        }

        // Clean up the login intent now that we've used it
        if (hasLoginIntent && user.email) {
          await serviceClient
            .from('engineer_login_intents')
            .delete()
            .eq('email', user.email.toLowerCase())
        }
      }

      const response = buildRedirect(request, origin, redirectPath)
      // Apply cookies with explicit options to ensure they propagate correctly
      cookieBuffer.forEach(({ name, value, options }) => {
        const cookieOptions = {
          ...options,
          path: '/',
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
        }
        response.cookies.set(name, value, cookieOptions)
      })
      // Clear the engineer flow cookie now that we've used it
      if (isEngineerFlow) {
        response.cookies.set('x-engineer-flow', '', {
          maxAge: 0,
          path: '/',
          domain: '.fractaltech.nyc',
        })
      }
      return response
    }
  }

  // Return the user to an error page with instructions
  const hasCode = searchParams.has('code')
  const errorParam = searchParams.get('error_description') || searchParams.get('error') || 'unknown'
  console.error('OAuth callback failed — hasCode:', hasCode, 'error:', errorParam)
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

const ALLOWED_HOSTS = new Set([
  'partners.fractaltech.nyc',
  'eng.fractaltech.nyc',
  'fractal-partners-portal.vercel.app',
])

function buildRedirect(request: Request, origin: string, path: string) {
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`)
  }
  // Engineer paths ALWAYS go to eng subdomain — never partners
  if (path.startsWith('/engineer')) {
    return NextResponse.redirect(`https://eng.fractaltech.nyc${path}`)
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost && ALLOWED_HOSTS.has(forwardedHost)) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }
  return NextResponse.redirect(`${origin}${path}`)
}
