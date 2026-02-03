import Link from 'next/link'
import { notFound } from 'next/navigation'
import RoleDetailClient from '@/components/hiring-spa/RoleDetailClient'
import type { HiringRole, MatchWithEngineer, RoleStatus } from '@/lib/hiring-spa/types'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

const STATUS_LABELS: Record<RoleStatus, string> = {
  draft: 'Draft',
  beautifying: 'Beautifying',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
}

async function getRole(id: string): Promise<HiringRole | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: role } = await supabase
    .from('hiring_roles')
    .select('*')
    .eq('id', id)
    .single()

  return (role as HiringRole) || null
}

async function getMatches(roleId: string): Promise<MatchWithEngineer[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('hiring_spa_matches')
    .select('*, engineer:engineer_profiles_spa(*), feedback:match_feedback(*), challenge_submission:challenge_submissions(*)')
    .eq('role_id', roleId)
    .order('display_rank', { ascending: true })

  // Normalize feedback and challenge_submission from join (array → single object or undefined)
  const normalized = (matches || []).map((m: Record<string, unknown>) => ({
    ...m,
    feedback: Array.isArray(m.feedback) ? m.feedback[0] || undefined : m.feedback || undefined,
    challenge_submission: Array.isArray(m.challenge_submission) ? m.challenge_submission[0] || undefined : m.challenge_submission || undefined,
  }))

  return normalized as MatchWithEngineer[]
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const role = await getRole(id)

  if (!role) {
    notFound()
  }

  const matches = await getMatches(role.id)

  return (
    <div className="spa-page">
      <Link href="/hiring-spa/roles" className="spa-btn-text" style={{ textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>
        &larr; Back to Roles
      </Link>

      <div className="spa-role-detail-header">
        <div>
          <h1 className="spa-heading-1" style={{ marginBottom: 4 }}>{role.title}</h1>
          <span className={`spa-badge spa-badge-${role.status}`}>
            {STATUS_LABELS[role.status]}
          </span>
        </div>
      </div>

      <RoleDetailClient role={role} initialMatches={matches} />
    </div>
  )
}
