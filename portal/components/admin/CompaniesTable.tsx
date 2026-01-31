'use client'

interface Company {
  id: string
  name: string
  email: string
  company_name?: string
  company_linkedin?: string
  company_stage?: string
  created_at: string
}

interface CompaniesTableProps {
  companies: Company[]
  onSelect: (id: string) => void
  selectedId?: string
}

const STAGE_LABELS: Record<string, string> = {
  bootstrapped: 'Bootstrapped',
  angel: 'Angel',
  'pre-seed': 'Pre-Seed',
  seed: 'Seed',
  bigger: 'Series A+',
}

export default function CompaniesTable({ companies, onSelect, selectedId }: CompaniesTableProps) {
  if (companies.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No companies match these filters.
      </div>
    )
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>Stage</th>
            <th>LinkedIn</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((co) => (
            <tr
              key={co.id}
              onClick={() => onSelect(co.id)}
              className={selectedId === co.id ? 'admin-row-selected' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td style={{ fontWeight: 700 }}>{co.company_name || '-'}</td>
              <td>
                <div>{co.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>{co.email}</div>
              </td>
              <td>
                {co.company_stage ? (
                  <span className="admin-flag" style={{ borderColor: 'var(--color-slate)', color: 'var(--color-slate)' }}>
                    {STAGE_LABELS[co.company_stage] || co.company_stage}
                  </span>
                ) : '-'}
              </td>
              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {co.company_linkedin ? (
                  <a
                    href={co.company_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 'var(--text-sm)' }}
                  >
                    {co.company_linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/company\//, '').replace(/\/$/, '') || 'View'}
                  </a>
                ) : '-'}
              </td>
              <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
                {new Date(co.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
