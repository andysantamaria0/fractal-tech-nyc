import { redirect } from 'next/navigation'
import './hiring-spa.css'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export default async function HiringSpaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defense-in-depth: verify access even though middleware checks too
  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_hiring_spa_access')
      .eq('id', user.id)
      .single()

    if (!profile?.has_hiring_spa_access) {
      redirect('/dashboard')
    }
  }

  return (
    <div className="hiring-spa">
      {children}
    </div>
  )
}
