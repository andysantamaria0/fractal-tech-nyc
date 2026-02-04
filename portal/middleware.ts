import { createServerClient } from '@supabase/ssr'
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

  // Dev bypass: refresh session but skip access control
  if (isDev) {
    return supabaseResponse
  }

  // Protected routes — redirect to login if not authenticated
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/cycles') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      (request.nextUrl.pathname.startsWith('/engineer') &&
        !request.nextUrl.pathname.startsWith('/engineer/apply')) ||
      request.nextUrl.pathname.startsWith('/complete-profile') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/hiring-spa'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
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
      request.nextUrl.pathname === '/signup' ||
      request.nextUrl.pathname === '/early-access')
  ) {
    // Check if user is an engineer first
    const { data: engineerProfile } = await supabase
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
