import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'

  if (!isDev && !isSupabaseConfigured) {
    // Fail closed in production — redirect to an error state
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Always create Supabase client to refresh session cookies (even in dev)
  if (!isSupabaseConfigured) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Dev bypass: skip access control but still handle auth-page redirects below
  if (isDev && !user) {
    return supabaseResponse
  }
  if (isDev && user && !(
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/early-access'
  )) {
    return supabaseResponse
  }

  // Protected routes — redirect to login if not authenticated
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/cycles') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      (request.nextUrl.pathname.startsWith('/engineer') &&
        !request.nextUrl.pathname.startsWith('/engineer/apply') &&
        !request.nextUrl.pathname.startsWith('/engineer/login')) ||
      request.nextUrl.pathname.startsWith('/complete-profile') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/hiring-spa'))
  ) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.pathname
    url.pathname = '/login'
    url.searchParams.set('redirect', redirectTo)
    return NextResponse.redirect(url)
  }

  // Admin routes — check is_admin flag
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Hiring Spa routes — check has_hiring_spa_access flag
  if (user && request.nextUrl.pathname.startsWith('/hiring-spa')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_hiring_spa_access')
      .eq('id', user.id)
      .single()

    if (!profile?.has_hiring_spa_access) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages (but not /complete-profile)
  if (
    user &&
    (request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/engineer/login' ||
      request.nextUrl.pathname === '/signup' ||
      request.nextUrl.pathname === '/early-access')
  ) {
    // Use service role client to bypass RLS for engineer detection
    const serviceClient = createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Check if user is an engineer first (linked profile)
    const { data: engineerProfile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single()

    if (engineerProfile) {
      const url = request.nextUrl.clone()
      url.pathname = '/engineer/dashboard'
      return NextResponse.redirect(url)
    }

    // Check engineers table (needs onboarding)
    if (user.email) {
      const { data: engineer } = await serviceClient
        .from('engineers')
        .select('id')
        .eq('email', user.email)
        .limit(1)
        .single()

      if (engineer) {
        const url = request.nextUrl.clone()
        url.pathname = '/engineer/onboard'
        return NextResponse.redirect(url)
      }
    }

    // Check if user has a company profile — if not, send them to complete it
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile ? '/dashboard' : '/complete-profile'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|callback).*)',
  ],
}
