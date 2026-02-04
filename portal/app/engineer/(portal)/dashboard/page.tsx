import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa, EngineerJobMatch } from '@/lib/hiring-spa/types'
import ProfileCompletionBanner from '@/components/engineer/ProfileCompletionBanner'
import WeeklyAppCounter from '@/components/engineer/WeeklyAppCounter'

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

  // Fetch match count and weekly applications
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

  return (
    <div className="engineer-dashboard">
      <div className="engineer-page-header">
        <h1>Dashboard</h1>
        <WeeklyAppCounter count={weeklyApps} />
      </div>

      <ProfileCompletionBanner profile={typedProfile} />

      <div className="engineer-stats-grid">
        <div className="engineer-stat-card">
          <div className="engineer-stat-value">{totalMatches}</div>
          <div className="engineer-stat-label">Job Matches</div>
        </div>
        <div className="engineer-stat-card">
          <div className="engineer-stat-value">{weeklyApps}</div>
          <div className="engineer-stat-label">Applied This Week</div>
        </div>
        <div className="engineer-stat-card">
          <div className="engineer-stat-value">{typedProfile.status}</div>
          <div className="engineer-stat-label">Profile Status</div>
        </div>
      </div>

      {typedProfile.status === 'complete' && totalMatches > 0 && (
        <div className="engineer-section">
          <h2>Your Matches</h2>
          <p className="engineer-section-desc">
            View your top job matches ranked by fit score.
          </p>
          <a href="/engineer/matches" className="btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>
            View All Matches
          </a>
        </div>
      )}

      {typedProfile.status === 'complete' && totalMatches === 0 && (
        <div className="engineer-matches-computing">
          <h2>We&apos;re finding your matches</h2>
          <p>
            We&apos;re scoring hundreds of jobs against your profile right now. This happens in the background — go about your day and we&apos;ll email you when your matches are ready.
          </p>
          <p className="engineer-matches-computing-hint">
            You can also check back here anytime. No need to keep this page open.
          </p>
        </div>
      )}
    </div>
  )
}
