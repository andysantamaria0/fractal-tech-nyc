import Link from 'next/link'
import RoleCard from '@/components/hiring-spa/RoleCard'
import type { HiringRole } from '@/lib/hiring-spa/types'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

async function getRoles(): Promise<HiringRole[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('hiring_profiles')
    .select('id')
    .eq('company_id', user.id)
    .single()

  if (!profile) return []

  const { data: roles } = await supabase
    .from('hiring_roles')
    .select('*')
    .eq('hiring_profile_id', profile.id)
    .order('created_at', { ascending: false })

  return (roles as HiringRole[]) || []
}

export default async function RolesPage() {
  const roles = await getRoles()

  return (
    <div className="spa-page">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="spa-heading-1" style={{ marginBottom: 4 }}>Open Roles</h1>
          <p className="spa-body-muted">Manage your job descriptions and role settings.</p>
        </div>
        <Link href="/hiring-spa/roles/new" className="spa-btn spa-btn-primary" style={{ textDecoration: 'none' }}>
          Add a Role
        </Link>
      </div>

      {roles.length === 0 ? (
        <div className="spa-status-card">
          <p className="spa-heading-3" style={{ marginBottom: 8 }}>No roles yet</p>
          <p className="spa-body-muted">
            Add your first role by pasting a job posting URL or typing the description.
          </p>
        </div>
      ) : (
        <div className="spa-role-cards">
          {roles.map(role => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}
    </div>
  )
}
