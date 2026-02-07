import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import EngineerHeader from '@/components/engineer/EngineerHeader'
import PortalAudioPlayer from '@/components/engineer/PortalAudioPlayer'
import PageTransition from '@/components/engineer/PageTransition'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

export const metadata: Metadata = {
  title: 'Fractal Engineers',
  description: 'Intelligent job matching for Fractal engineers — build your EngineerDNA, get matched to roles that fit your skills, culture, and career goals.',
}

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
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // Use service client to bypass RLS for engineer lookup
    // (RLS can fail if JWT refresh doesn't propagate to server components)
    const serviceClient = await createServiceClient()
    const { data: engineerProfile } = await serviceClient
      .from('engineers')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

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
    <div style={{ minHeight: '100vh', backgroundColor: c.platinum, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`@media (max-width: 640px) { .ep-main { padding: 24px 16px !important; } }`}</style>
      <EngineerHeader engineerName={engineerName} />
      <main className="ep-main" style={{ maxWidth: 900, margin: '0 auto', padding: 48 }}>
        <PageTransition>{children}</PageTransition>
      </main>
      <footer style={{
        textAlign: 'center', padding: '24px 48px',
        borderTop: `1px solid ${c.stoneLight}`,
      }}>
        <a href="https://fractaltech.nyc" style={{
          fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em',
          color: c.mist, textDecoration: 'none',
        }}>
          fractaltech.nyc
        </a>
      </footer>
      <PortalAudioPlayer />
    </div>
  )
}
