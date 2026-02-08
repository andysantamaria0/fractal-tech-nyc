import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export async function middleware(request: NextRequest) {
  // Engineer subdomain: NEVER show company pages. Engineers must only see
  // /engineer/* routes. This is the hard guard — no matter how a user arrives
  // (lost query params, stale links, redirects), the eng subdomain always
  // funnels to engineer flows.
  const host = request.headers.get('host') || ''
  if (host.startsWith('eng.')) {
    const p = request.nextUrl.pathname
    if (p === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/engineer/login'
      return NextResponse.redirect(url)
    }
    if (p === '/complete-profile' || p === '/login' || p === '/signup' || p === '/early-access') {
      const url = request.nextUrl.clone()
      url.pathname = '/engineer/login'
      return NextResponse.redirect(url)
    }
    if (p === '/dashboard' || p.startsWith('/cycles') || p.startsWith('/settings') || p.startsWith('/hiring-spa')) {
      const url = request.nextUrl.clone()
      url.pathname = '/engineer/onboard'
      return NextResponse.redirect(url)
    }
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              path: '/',
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
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
    // Engineers go to engineer login, never the company portal
    if (request.nextUrl.pathname.startsWith('/engineer')) {
      url.pathname = '/engineer/login'
    } else {
      url.pathname = '/login'
    }
    url.searchParams.set('redirect', redirectTo)
    return NextResponse.redirect(url)
  }

  // Admin routes — check is_admin flag
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

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
      .maybeSingle()

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

    // Check if user is an engineer (by auth_user_id first, then email)
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
      const url = request.nextUrl.clone()
      if (engineer.auth_user_id && engineer.status !== 'draft') {
        url.pathname = '/engineer/dashboard'
      } else {
        url.pathname = '/engineer/onboard'
      }
      return NextResponse.redirect(url)
    }

    // Engineer login flow: user not in engineers table yet — send to onboard, not company flow
    if (request.nextUrl.pathname === '/engineer/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/engineer/onboard'
      return NextResponse.redirect(url)
    }

    // Check if user has a company profile — if not, send them to complete it
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

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
