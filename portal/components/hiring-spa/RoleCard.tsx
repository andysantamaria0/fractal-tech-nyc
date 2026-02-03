import Link from 'next/link'
import type { HiringRole, RoleStatus } from '@/lib/hiring-spa/types'

const STATUS_LABELS: Record<RoleStatus, string> = {
  draft: 'Draft',
  beautifying: 'Beautifying',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function truncateUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch {
    return url.slice(0, 30)
  }
}

export default function RoleCard({ role }: { role: HiringRole }) {
  return (
    <Link href={`/hiring-spa/roles/${role.id}`} className="spa-role-card">
      <div className="spa-role-card-header">
        <h3 className="spa-role-card-title">{role.title}</h3>
        <span className={`spa-badge spa-badge-${role.status}`}>
          {STATUS_LABELS[role.status]}
        </span>
      </div>
      <div className="spa-role-card-meta">
        {role.source_url && (
          <span className="spa-role-card-source">{truncateUrl(role.source_url)}</span>
        )}
        <span className="spa-role-card-date">{formatDate(role.created_at)}</span>
      </div>
    </Link>
  )
}
