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

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    userName = profile?.name
  } else {
    // Dev bypass — show pages without auth
    userName = 'Dev User'
  }

  return (
    <>
      <Header userName={userName} />
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
