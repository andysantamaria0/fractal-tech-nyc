import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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

      // Check if user has a profile already
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // If no profile, redirect to profile completion
        if (!profile) {
          redirectPath = '/complete-profile'
        }
      }

      const response = buildRedirect(request, origin, redirectPath)
      cookieBuffer.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Record<string, unknown>)
      })
      return response
    }
  }

  // Return the user to an error page with instructions
  const hasCode = searchParams.has('code')
  const errorParam = searchParams.get('error_description') || searchParams.get('error') || 'unknown'
  console.error('OAuth callback failed — hasCode:', hasCode, 'error:', errorParam)
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

function buildRedirect(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  } else {
    return NextResponse.redirect(`${origin}${path}`)
  }
}
