'use client'

interface Engineer {
  id: string
  name: string
  email: string
  focus_areas?: string[]
  is_available_for_cycles: boolean
  availability_hours_per_week?: number
  github_url?: string
  created_at: string
}

interface EngineersTableProps {
  engineers: Engineer[]
  onSelect: (id: string) => void
  selectedId?: string
  onToggleAvailability: (id: string, available: boolean) => void
}

export default function EngineersTable({ engineers, onSelect, selectedId, onToggleAvailability }: EngineersTableProps) {
  if (engineers.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No engineers match these filters.
      </div>
    )
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Focus Areas</th>
            <th>Hours/wk</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          {engineers.map((eng) => (
            <tr
              key={eng.id}
              onClick={() => onSelect(eng.id)}
              className={selectedId === eng.id ? 'admin-row-selected' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td style={{ fontWeight: 700 }}>{eng.name}</td>
              <td>{eng.email}</td>
              <td>
                {eng.focus_areas && eng.focus_areas.length > 0
                  ? eng.focus_areas.map((area, i) => (
                      <span
                        key={i}
                        className="admin-flag"
                        style={{ borderColor: 'var(--color-slate)', color: 'var(--color-slate)' }}
                      >
                        {area}
                      </span>
                    ))
                  : '-'}
              </td>
              <td>{eng.availability_hours_per_week ?? '-'}</td>
              <td>
                <input
                  type="checkbox"
                  checked={eng.is_available_for_cycles}
                  onChange={(e) => {
                    e.stopPropagation()
                    onToggleAvailability(eng.id, e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
