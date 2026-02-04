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
  const isCrawling = profile.status === 'crawling'

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

      {isCrawling && (
        <div className="engineer-crawling-banner">
          <strong>We&apos;re analyzing your profile in the background.</strong>
          <p>We&apos;re scanning your GitHub and portfolio to build your technical DNA. In the meantime, help us understand you better through this questionnaire. You&apos;re already beautiful and you earned the spa.</p>
        </div>
      )}

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
