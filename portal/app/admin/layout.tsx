import { redirect } from 'next/navigation'
import Link from 'next/link'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let isAdminUser = false
  let userName = 'Admin'

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      redirect('/dashboard')
    }

    isAdminUser = true
    userName = profile.name || 'Admin'
  } else {
    // Dev bypass
    isAdminUser = true
  }

  if (!isAdminUser) {
    redirect('/dashboard')
  }

  return (
    <>
      <header className="portal-header admin-header">
        <div className="header-content">
          <Link href="/admin/cycles" className="logo">Fractal Admin</Link>
          <nav>
            <ul className="nav-links">
              <li><Link href="/admin/cycles">Cycles</Link></li>
              <li><Link href="/admin/invite">Invite</Link></li>
              <li><Link href="/admin/import">Import</Link></li>
              <li><Link href="/dashboard">Portal</Link></li>
              <li>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {userName}
                </span>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main>
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="portal-footer">
        <div className="container">
          <div className="footer-text">
            <p><a href="https://fractaltech.nyc">fractaltech.nyc</a> &middot; Admin Panel</p>
          </div>
        </div>
      </footer>
    </>
  )
}
