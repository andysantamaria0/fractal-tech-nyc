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

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth code exchange failed:', error.message, error)
    }

    if (!error) {
      let redirectPath = next

      // Cross-subdomain cookie set by /engineer/login — survives even when
      // Supabase strips the ?next= param during redirect. See CLAUDE.md.
      const isEngineerFlow = cookieStore.get('x-engineer-flow')?.value === '1'

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
        } else if (isEngineerFlow || next.startsWith('/engineer')) {
          // Engineer flow: cookie or query param confirms this is an engineer
          redirectPath = '/engineer/onboard'
        } else {
          // No engineer record, no engineer cookie, no engineer next param.
          // Check for company profile to decide where to send them.
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            redirectPath = next
          } else {
            // No record anywhere — send to engineer onboard as safe default
            redirectPath = '/engineer/onboard'
          }
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
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`)
  } else if (forwardedHost && ALLOWED_HOSTS.has(forwardedHost)) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  } else {
    return NextResponse.redirect(`${origin}${path}`)
  }
}
