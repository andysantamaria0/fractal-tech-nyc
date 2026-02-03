import Link from 'next/link'
import ProfileSummary from '@/components/hiring-spa/ProfileSummary'
import HiringSpaTracker from '@/components/hiring-spa/HiringSpaTracker'
import RoleCard from '@/components/hiring-spa/RoleCard'
import RoleSelectionForm from '@/components/hiring-spa/RoleSelectionForm'
import RetryOnboardButton from '@/components/hiring-spa/RetryOnboardButton'
import type { HiringProfile, HiringRole, DiscoveredRole, ProfileSummary as ProfileSummaryType } from '@/lib/hiring-spa/types'

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
    .single()

  return profile as HiringProfile | null
}

async function getRecentRoles(profileId: string): Promise<HiringRole[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from('hiring_roles')
    .select('*')
    .eq('hiring_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (roles as HiringRole[]) || []
}

async function getPendingMatchCount(profileId: string): Promise<{ total: number; byRole: { roleId: string; roleTitle: string; count: number }[] }> {
  if (!isSupabaseConfigured) {
    return { total: 0, byRole: [] }
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Get roles for this profile
  const { data: roles } = await supabase
    .from('hiring_roles')
    .select('id, title')
    .eq('hiring_profile_id', profileId)

  if (!roles || roles.length === 0) {
    return { total: 0, byRole: [] }
  }

  const roleIds = roles.map(r => r.id)

  // Get pending matches (no decision yet)
  const { data: matches } = await supabase
    .from('hiring_spa_matches')
    .select('id, role_id')
    .in('role_id', roleIds)
    .is('decision', null)

  if (!matches || matches.length === 0) {
    return { total: 0, byRole: [] }
  }

  const byRole = roles
    .map(r => ({
      roleId: r.id,
      roleTitle: r.title,
      count: matches.filter(m => m.role_id === r.id).length,
    }))
    .filter(r => r.count > 0)

  return { total: matches.length, byRole }
}

function countSavedSections(profile: HiringProfile): number {
  let count = 0
  if (profile.culture_answers) count++
  if (profile.mission_answers) count++
  if (profile.team_dynamics_answers) count++
  if (profile.technical_environment) count++
  return count
}

async function RolesAndProfile({ profile }: { profile: HiringProfile }) {
  const roles = await getRecentRoles(profile.id)
  const matchInfo = await getPendingMatchCount(profile.id)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <p className="spa-label-emphasis">Your Profile</p>
        <Link href="/hiring-spa/profile" className="spa-btn-text" style={{ textDecoration: 'none' }}>
          Edit questionnaire &rarr;
        </Link>
      </div>

      <ProfileSummary summary={profile.profile_summary as ProfileSummaryType} />

      {/* Open Roles */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <p className="spa-label-emphasis">Open Roles</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/hiring-spa/roles" className="spa-btn-text" style={{ textDecoration: 'none' }}>
              View all &rarr;
            </Link>
            <Link href="/hiring-spa/roles/new" className="spa-btn-text" style={{ textDecoration: 'none' }}>
              Add a Role &rarr;
            </Link>
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="spa-card" style={{ textAlign: 'center' }}>
            <p className="spa-body-muted" style={{ marginBottom: 12 }}>No roles yet</p>
            <Link href="/hiring-spa/roles/new" className="spa-btn spa-btn-secondary" style={{ textDecoration: 'none' }}>
              Add Your First Role
            </Link>
          </div>
        ) : (
          <div className="spa-role-cards">
            {roles.map(role => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>

      {/* Engineer Matches */}
      <div style={{ marginTop: 48 }}>
        <p className="spa-label-emphasis" style={{ marginBottom: 16 }}>Engineer Matches</p>
        {matchInfo.total === 0 ? (
          <div className="spa-card" style={{ textAlign: 'center' }}>
            <p className="spa-body-muted">No pending matches yet. Matches will appear here once they&apos;re computed for your roles.</p>
          </div>
        ) : (
          <div className="spa-card-accent">
            <p className="spa-heading-3" style={{ marginBottom: 8 }}>
              {matchInfo.total} pending {matchInfo.total === 1 ? 'match' : 'matches'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matchInfo.byRole.map(r => (
                <Link
                  key={r.roleId}
                  href={`/hiring-spa/roles/${r.roleId}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="spa-body-small">{r.roleTitle}</span>
                    <span className="spa-badge spa-badge-honey">
                      {r.count} {r.count === 1 ? 'match' : 'matches'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function HiringSpaHome() {
  const profile = await getProfile()

  return (
    <div className="spa-page">
      <HiringSpaTracker profileStatus={profile?.status ?? null} />
      <div style={{ marginBottom: 48 }}>
        <h1 className="spa-display" style={{ marginBottom: 8 }}>Hiring Spa</h1>
        <p className="spa-body-muted">Your company hiring profile, crafted with care.</p>
      </div>

      {/* No profile or draft */}
      {(!profile || profile.status === 'draft') && (
        <div className="spa-status-card">
          <p className="spa-label-emphasis" style={{ marginBottom: 16 }}>Getting Started</p>
          <p className="spa-heading-2" style={{ marginBottom: 12 }}>
            {profile?.crawl_error
              ? "We couldn\u2019t analyze your website"
              : "Setting up your profile"}
          </p>
          <p className="spa-body-muted">
            {profile?.crawl_error
              ? `Something went wrong: ${profile.crawl_error}. You can try again below.`
              : "We\u2019re preparing to analyze your company\u2019s web presence. This should start automatically."}
          </p>
          {profile?.crawl_error && <RetryOnboardButton />}
        </div>
      )}

      {/* Crawling */}
      {profile?.status === 'crawling' && (
        <div className="spa-status-card">
          <p className="spa-label-emphasis" style={{ marginBottom: 16 }}>In Progress</p>
          <p className="spa-heading-2" style={{ marginBottom: 12 }}>
            We&apos;re analyzing your web presence
          </p>
          <p className="spa-body-muted">
            We&apos;re crawling your website and GitHub to understand your company&apos;s
            culture, tech stack, and values. This usually takes a few minutes.
          </p>
          <div className="spa-progress-track" style={{ maxWidth: 300, margin: '24px auto 0' }}>
            <div className="spa-progress-fill" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Discovering Roles */}
      {profile?.status === 'discovering_roles' && (
        <div>
          <div className="spa-card-accent" style={{ marginBottom: 32 }}>
            <p className="spa-label-emphasis" style={{ marginBottom: 12 }}>Roles Found</p>
            <p className="spa-heading-2" style={{ marginBottom: 8 }}>
              We found open engineering roles on your careers page
            </p>
            <p className="spa-body-muted" style={{ marginBottom: 20 }}>
              Select the roles you&apos;d like to bring into the Hiring Spa.
              We&apos;ll beautify the job descriptions and start finding matching engineers.
            </p>
          </div>
          <RoleSelectionForm
            discoveredRoles={(profile.discovered_roles as DiscoveredRole[]) || []}
          />
        </div>
      )}

      {/* Questionnaire ready */}
      {profile?.status === 'questionnaire' && (
        <div>
          <div className="spa-card-accent" style={{ marginBottom: 32 }}>
            <p className="spa-label-emphasis" style={{ marginBottom: 12 }}>Ready for You</p>
            <p className="spa-heading-2" style={{ marginBottom: 8 }}>
              Complete your hiring questionnaire
            </p>
            <p className="spa-body-muted" style={{ marginBottom: 20 }}>
              We&apos;ve pre-populated some answers from your web presence.
              Review, refine, and add your perspective. Take your time.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="/hiring-spa/profile" className="spa-btn spa-btn-primary" style={{ textDecoration: 'none' }}>
                Start Questionnaire
              </Link>
              <span className="spa-body-small">
                {countSavedSections(profile)} of 4 sections complete
              </span>
            </div>
            {countSavedSections(profile) > 0 && (
              <div className="spa-progress-track" style={{ marginTop: 16 }}>
                <div className="spa-progress-fill" style={{ width: `${(countSavedSections(profile) / 4) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Future sections skeleton */}
          <div style={{ marginTop: 48 }}>
            <p className="spa-label" style={{ marginBottom: 16 }}>Coming Soon</p>
            <div className="spa-skeleton">
              <p className="spa-heading-3" style={{ opacity: 0.5, marginBottom: 4 }}>Open Roles</p>
              <div className="spa-skeleton-text" style={{ width: '60%' }} />
            </div>
            <div className="spa-skeleton">
              <p className="spa-heading-3" style={{ opacity: 0.5, marginBottom: 4 }}>Engineer Matches</p>
              <div className="spa-skeleton-text" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Complete */}
      {profile?.status === 'complete' && profile.profile_summary && (
        <RolesAndProfile profile={profile} />
      )}
    </div>
  )
}
