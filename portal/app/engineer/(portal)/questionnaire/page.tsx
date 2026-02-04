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

  const isEditing = profile.status === 'complete'

  return (
    <div className="engineer-questionnaire-page">
      <div className="engineer-page-header">
        <h1>{isEditing ? 'Edit Questionnaire' : 'Questionnaire'}</h1>
        <p className="engineer-section-desc">
          {isEditing
            ? 'Update your answers below. Your existing matches will stay visible while we recompute new ones.'
            : 'Step 2 of 3 — Tell us what matters to you so we can find jobs that actually fit. This takes about 5 minutes.'}
        </p>
      </div>

      {isEditing && (
        <div className="engineer-reanalysis-warning">
          <strong>Heads up:</strong> Saving changes will trigger a new analysis of your profile against all active jobs.
          Your current matches will remain visible, but new scores may shift your rankings. This process runs in the background.
        </div>
      )}

      <EngineerQuestionnaireForm profile={profile as EngineerProfileSpa} isEditing={isEditing} />
    </div>
  )
}
