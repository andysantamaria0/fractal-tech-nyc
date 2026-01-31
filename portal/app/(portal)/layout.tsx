import { redirect } from 'next/navigation'
import Header from '@/components/Header'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userName: string | undefined
  let isAdmin = false

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

    userName = profile?.name
    isAdmin = profile?.is_admin === true
  } else if (process.env.NODE_ENV !== 'production') {
    // Dev bypass — show pages without auth (local dev only)
    userName = 'Dev User'
    isAdmin = true
  } else {
    // Fail closed in production
    redirect('/login')
  }

  return (
    <>
      <Header userName={userName} isAdmin={isAdmin} />
      <main>
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="portal-footer">
        <div className="container">
          <div className="footer-text">
            <p><a href="https://fractaltech.nyc">fractaltech.nyc</a></p>
          </div>
        </div>
      </footer>
    </>
  )
}
