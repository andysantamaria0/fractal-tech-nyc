import { redirect } from 'next/navigation'
import QuestionnaireForm from '@/components/hiring-spa/QuestionnaireForm'
import type { HiringProfile } from '@/lib/hiring-spa/types'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

async function getProfile(): Promise<HiringProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('hiring_profiles')
    .select('*')
    .eq('company_id', user.id)
    .maybeSingle()

  return profile as HiringProfile | null
}

export default async function QuestionnairePage() {
  const profile = await getProfile()

  // Must have a profile in questionnaire or complete status
  if (!profile || (profile.status !== 'questionnaire' && profile.status !== 'complete')) {
    redirect('/hiring-spa')
  }

  return (
    <div className="spa-page">
      <div style={{ marginBottom: 48 }}>
        <h1 className="spa-display" style={{ marginBottom: 8 }}>Your Hiring Profile</h1>
        <p className="spa-body-muted">
          Take your time. Each section saves independently.
        </p>
      </div>

      <QuestionnaireForm profile={profile} />
    </div>
  )
}
