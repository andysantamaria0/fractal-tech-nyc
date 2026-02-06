import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import EngineerProfileView from '@/components/engineer/EngineerProfileView'
import MatchingPreferencesEditor from '@/components/engineer/MatchingPreferencesEditor'
import Link from 'next/link'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

export default async function EngineerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineers')
    .select('id, name, email, status, linkedin_url, github_url, portfolio_url, resume_url, engineer_dna, profile_summary')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')

  const typedProfile = profile as EngineerProfileSpa

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: 0 }}>
          Your Profile
        </h1>
      </div>

      <EngineerProfileView profile={typedProfile} />

      {typedProfile.status === 'complete' && (
        <div style={{
          backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
          borderRadius: 8, padding: '24px 28px', marginTop: 32,
        }}>
          <h3 style={{ fontFamily: f.serif, fontSize: 17, fontWeight: 400, color: c.charcoal, margin: '0 0 6px 0' }}>
            Questionnaire Answers
          </h3>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 16px 0', lineHeight: 1.6 }}>
            Your preferences and priorities are used to score job matches. Updating them will trigger a fresh round of matching.
          </p>
          <Link href="/engineer/questionnaire" style={{
            display: 'inline-block', fontFamily: f.mono, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            backgroundColor: 'transparent', color: c.graphite,
            border: `1px solid ${c.stone}`, borderRadius: 4,
            padding: '12px 24px', textDecoration: 'none', transition: '150ms ease',
          }}>
            Edit Questionnaire
          </Link>
        </div>
      )}

      {typedProfile.status === 'complete' && (
        <div style={{ marginTop: 32 }}>
          <MatchingPreferencesEditor />
        </div>
      )}

      {!typedProfile.resume_url && typedProfile.status !== 'draft' && (
        <div style={{
          backgroundColor: c.parchment, border: `1px solid ${c.honeyBorder}`,
          borderRadius: 8, padding: '24px 28px', marginTop: 32,
        }}>
          <strong style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal }}>
            Resume not found
          </strong>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '8px 0 16px 0', lineHeight: 1.6 }}>
            We couldn&apos;t find a resume on your portfolio or GitHub. Add a direct link to help companies evaluate your background.
          </p>
          <Link href="/engineer/profile" style={{
            display: 'inline-block', fontFamily: f.mono, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            backgroundColor: 'transparent', color: c.graphite,
            border: `1px solid ${c.stone}`, borderRadius: 4,
            padding: '12px 24px', textDecoration: 'none', transition: '150ms ease',
          }}>
            Add Resume URL
          </Link>
        </div>
      )}
    </div>
  )
}
