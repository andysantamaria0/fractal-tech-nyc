import { redirect } from 'next/navigation'
import EngineerHeader from '@/components/engineer/EngineerHeader'

export default async function EngineerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

  let engineerName: string | undefined

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // Check engineer_profiles_spa for linked profile
    const { data: engineerProfile } = await supabase
      .from('engineer_profiles_spa')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!engineerProfile) {
      redirect('/engineer/onboard')
    }

    engineerName = engineerProfile.name
  } else if (process.env.NODE_ENV !== 'production') {
    engineerName = 'Dev Engineer'
  } else {
    redirect('/login')
  }

  return (
    <>
      <EngineerHeader engineerName={engineerName} />
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
