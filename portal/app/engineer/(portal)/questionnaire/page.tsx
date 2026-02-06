import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import EngineerQuestionnaireForm from '@/components/engineer/EngineerQuestionnaireForm'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

export default async function EngineerQuestionnairePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineers')
    .select('id, status, priority_ratings, work_preferences, career_growth, strengths, growth_areas, deal_breakers')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')

  const isEditing = profile.status === 'complete'
  const isCrawling = profile.status === 'crawling'

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
          {isEditing ? 'Edit Questionnaire' : 'Questionnaire'}
        </h1>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: 0, lineHeight: 1.8 }}>
          {isEditing
            ? 'Update your answers below. Your existing matches will stay visible while we recompute new ones.'
            : 'Step 2 of 3 — Tell us what matters to you so we can find jobs that actually fit.'}
        </p>
      </div>

      {isCrawling && (
        <div style={{
          backgroundColor: c.parchment, border: `1px solid ${c.honeyBorder}`,
          borderRadius: 8, padding: '20px 24px', marginBottom: 24,
        }}>
          <strong style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal }}>
            We&apos;re analyzing your profile in the background.
          </strong>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '8px 0 0 0', lineHeight: 1.6 }}>
            We&apos;re scanning your GitHub and portfolio to build your technical DNA. In the meantime, help us understand you better through this questionnaire.
          </p>
        </div>
      )}

      {isEditing && (
        <div style={{
          backgroundColor: c.parchment, border: `1px solid ${c.stoneLight}`,
          borderRadius: 8, padding: '20px 24px', marginBottom: 24,
        }}>
          <strong style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal }}>
            Heads up:
          </strong>
          <span style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, marginLeft: 8 }}>
            Saving changes will trigger a new analysis of your profile against all active jobs.
            Your current matches will remain visible, but new scores may shift your rankings.
          </span>
        </div>
      )}

      <EngineerQuestionnaireForm profile={profile as EngineerProfileSpa} isEditing={isEditing} />
    </div>
  )
}
