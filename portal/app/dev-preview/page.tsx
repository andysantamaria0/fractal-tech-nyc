import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa, EngineerJobMatchWithJob } from '@/lib/hiring-spa/types'
import EngineerHeader from '@/components/engineer/EngineerHeader'
import ProfileCompletionBanner from '@/components/engineer/ProfileCompletionBanner'
import WeeklyAppCounter from '@/components/engineer/WeeklyAppCounter'
import JobMatchList from '@/components/engineer/JobMatchList'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

export default async function DevPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; page?: string }>
}) {
  if (process.env.NODE_ENV === 'production') redirect('/')

  const params = await searchParams
  const email = params.email || 'peteryelton@gmail.com'
  const page = params.page || 'dashboard'

  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('engineer_profiles_spa')
    .select('*')
    .eq('email', email)
    .single()

  if (!profile) {
    return <div style={{ padding: 48, fontFamily: f.serif, color: c.charcoal }}>No profile found for {email}</div>
  }

  const typedProfile = profile as EngineerProfileSpa

  const { data: matches } = await supabase
    .from('engineer_job_matches')
    .select('*, scanned_job:scanned_jobs(*)')
    .eq('engineer_profile_id', typedProfile.id)
    .is('feedback', null)
    .order('display_rank', { ascending: true })
    .limit(10)

  const { data: allMatches } = await supabase
    .from('engineer_job_matches')
    .select('id, feedback, applied_at')
    .eq('engineer_profile_id', typedProfile.id)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyApps = (allMatches || []).filter(
    m => m.applied_at && new Date(m.applied_at) >= weekAgo
  ).length
  const totalMatches = (allMatches || []).filter(m => m.feedback !== 'not_a_fit').length

  const statCard: React.CSSProperties = {
    backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
    borderRadius: 8, padding: '24px 32px', textAlign: 'center',
  }

  const navLinks = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Matches', page: 'matches' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: c.platinum, WebkitFontSmoothing: 'antialiased' }}>
      <EngineerHeader engineerName={typedProfile.name} />

      {/* Dev preview nav */}
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '16px 48px 0 48px',
        display: 'flex', gap: 12,
      }}>
        {navLinks.map(link => (
          <a
            key={link.page}
            href={`/dev-preview?email=${email}&page=${link.page}`}
            style={{
              fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: page === link.page ? c.honey : c.mist,
              textDecoration: 'none', padding: '8px 16px',
              borderBottom: page === link.page ? `2px solid ${c.honey}` : '2px solid transparent',
            }}
          >
            {link.label}
          </a>
        ))}
        <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist, marginLeft: 'auto', alignSelf: 'center' }}>
          DEV PREVIEW — {typedProfile.name}
        </span>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 48 }}>
        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: 0 }}>
                Dashboard
              </h1>
              <WeeklyAppCounter count={weeklyApps} />
            </div>

            <ProfileCompletionBanner profile={typedProfile} />

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

            {typedProfile.status === 'complete' && totalMatches > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
                  Your Matches
                </h2>
                <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 16px 0' }}>
                  View your top job matches ranked by fit score.
                </p>
                <a href={`/dev-preview?email=${email}&page=matches`} style={{
                  display: 'inline-block', fontFamily: f.mono, fontSize: 11,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  backgroundColor: c.charcoal, color: c.parchment, textDecoration: 'none',
                  borderRadius: 4, padding: '14px 28px', transition: '150ms ease',
                }}>
                  View All Matches
                </a>
              </div>
            )}

            {typedProfile.status === 'complete' && totalMatches === 0 && (
              <div style={{
                backgroundColor: c.parchment, border: `1px solid ${c.honeyBorder}`,
                borderRadius: 8, padding: 32, textAlign: 'center',
              }}>
                <h2 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 12px 0' }}>
                  We&apos;re finding your matches
                </h2>
                <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 12px 0', lineHeight: 1.8 }}>
                  We&apos;re scoring hundreds of jobs against your profile right now.
                </p>
              </div>
            )}
          </div>
        )}

        {page === 'matches' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
                Your Job Matches
              </h1>
              <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: 0, lineHeight: 1.8 }}>
                Top matches based on your profile and preferences. Scored across 5 dimensions.
              </p>
            </div>
            <JobMatchList matches={(matches || []) as EngineerJobMatchWithJob[]} />
          </div>
        )}
      </main>
    </div>
  )
}
