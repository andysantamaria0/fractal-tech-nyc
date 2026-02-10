import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? null

  // Validate redirect target to prevent open redirects
  const nextFromParam = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  if (code) {
    const cookieStore = await cookies()
    // Buffer cookies so we can apply them to the redirect response directly.
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
    const isEngineerFlow = cookieStore.get('x-engineer-flow')?.value === '1'

    // Redirect target from login page (survives Google OAuth round-trip via cookie)
    const loginRedirectRaw = cookieStore.get('x-login-redirect')?.value
    const loginRedirect = loginRedirectRaw
      ? decodeURIComponent(loginRedirectRaw)
      : null
    const safeLoginRedirect = loginRedirect && loginRedirect.startsWith('/') && !loginRedirect.startsWith('//') ? loginRedirect : null
    const next = nextFromParam ?? safeLoginRedirect ?? '/dashboard'

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth code exchange failed:', error.message, error)
      if (isEngineerFlow) {
        return NextResponse.redirect(`https://eng.fractaltech.nyc/engineer/login?error=link`)
      }
    }

    if (!error) {
      let redirectPath = next

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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

        // Server-side intent: survives across browsers
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            redirectPath = next
          } else {
            redirectPath = '/engineer/onboard'
          }
        }

        // Clean up the login intent
        if (hasLoginIntent && user.email) {
          await serviceClient
            .from('engineer_login_intents')
            .delete()
            .eq('email', user.email.toLowerCase())
        }
      }

      const response = buildRedirect(request, origin, redirectPath)
      cookieBuffer.forEach(({ name, value, options }) => {
        const cookieOptions = {
          ...options,
          path: '/',
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
        }
        response.cookies.set(name, value, cookieOptions)
      })
      if (isEngineerFlow) {
        response.cookies.set('x-engineer-flow', '', {
          maxAge: 0,
          path: '/',
          domain: '.fractaltech.nyc',
        })
      }
      if (loginRedirect) {
        response.cookies.set('x-login-redirect', '', {
          maxAge: 0,
          path: '/',
          ...(process.env.NODE_ENV === 'production' && { domain: '.fractaltech.nyc' }),
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
  if (path.startsWith('/engineer')) {
    return NextResponse.redirect(`https://eng.fractaltech.nyc${path}`)
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost && ALLOWED_HOSTS.has(forwardedHost)) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }
  return NextResponse.redirect(`${origin}${path}`)
}
