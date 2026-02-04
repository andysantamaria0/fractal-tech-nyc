import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import ProfileCompletionBanner from '@/components/engineer/ProfileCompletionBanner'
import WeeklyAppCounter from '@/components/engineer/WeeklyAppCounter'

const c = {
  fog: '#F7F5F2', parchment: '#FAF8F5', charcoal: '#2C2C2C', graphite: '#5C5C5C',
  mist: '#9C9C9C', honey: '#C9A86C', match: '#8B7355',
  stoneLight: 'rgba(166, 155, 141, 0.12)',
  honeyBorder: 'rgba(201, 168, 108, 0.30)',
  honeyLight: 'rgba(201, 168, 108, 0.20)',
}
const f = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", Monaco, Inconsolata, "Fira Code", monospace',
}

export default async function EngineerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineer_profiles_spa')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')
  if (profile.status === 'draft') redirect('/engineer/onboard')

  const typedProfile = profile as EngineerProfileSpa

  const { data: matches } = await supabase
    .from('engineer_job_matches')
    .select('id, feedback, applied_at')
    .eq('engineer_profile_id', typedProfile.id)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyApps = (matches || []).filter(
    m => m.applied_at && new Date(m.applied_at) >= weekAgo
  ).length

  const totalMatches = (matches || []).filter(m => m.feedback !== 'not_a_fit').length

  const statCard: React.CSSProperties = {
    backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
    borderRadius: 8, padding: '24px 32px', textAlign: 'center',
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: 0 }}>
          Dashboard
        </h1>
        <WeeklyAppCounter count={weeklyApps} />
      </div>

      <ProfileCompletionBanner profile={typedProfile} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        <div style={statCard}>
          <div style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 500, color: c.match, marginBottom: 4 }}>
            {totalMatches}
          </div>
          <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist }}>
            Job Matches
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 500, color: c.match, marginBottom: 4 }}>
            {weeklyApps}
          </div>
          <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist }}>
            Applied This Week
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontFamily: f.mono, fontSize: 14, fontWeight: 500, color: c.charcoal, marginBottom: 4 }}>
            {typedProfile.status}
          </div>
          <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist }}>
            Profile Status
          </div>
        </div>
      </div>

      {/* Matches CTA */}
      {typedProfile.status === 'complete' && totalMatches > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
            Your Matches
          </h2>
          <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 16px 0' }}>
            View your top job matches ranked by fit score.
          </p>
          <a href="/engineer/matches" style={{
            display: 'inline-block', fontFamily: f.mono, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            backgroundColor: c.charcoal, color: c.parchment, textDecoration: 'none',
            borderRadius: 4, padding: '14px 28px', transition: '150ms ease',
          }}>
            View All Matches
          </a>
        </div>
      )}

      {/* Computing state */}
      {typedProfile.status === 'complete' && totalMatches === 0 && (
        <div style={{
          backgroundColor: c.parchment, border: `1px solid ${c.honeyBorder}`,
          borderRadius: 8, padding: 32, textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 12px 0' }}>
            We&apos;re finding your matches
          </h2>
          <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 12px 0', lineHeight: 1.8 }}>
            We&apos;re scoring hundreds of jobs against your profile right now. This happens in the background — go about your day and we&apos;ll email you when your matches are ready.
          </p>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.mist, margin: 0 }}>
            You can also check back here anytime. No need to keep this page open.
          </p>
        </div>
      )}
    </div>
  )
}
