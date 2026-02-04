import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import EngineerQuestionnaireForm from '@/components/engineer/EngineerQuestionnaireForm'

export default async function EngineerQuestionnairePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineer_profiles_spa')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')

  return (
    <div className="engineer-questionnaire-page">
      <div className="engineer-page-header">
        <h1>Questionnaire</h1>
        <p className="engineer-page-desc">
          Help us understand what you&apos;re looking for so we can find the best matches.
        </p>
      </div>
      <EngineerQuestionnaireForm profile={profile as EngineerProfileSpa} />
    </div>
  )
}
