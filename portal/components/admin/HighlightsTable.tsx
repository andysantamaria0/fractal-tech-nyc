'use client'

interface Highlight {
  id: string
  week_number: number
  cohort_start_date: string
  title?: string
  description: string
  created_at: string
}

interface HighlightsTableProps {
  highlights: Highlight[]
  onSelect: (id: string) => void
  selectedId?: string
}

export default function HighlightsTable({ highlights, onSelect, selectedId }: HighlightsTableProps) {
  if (highlights.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No highlights yet. Click &quot;Add Highlight&quot; to create one.
      </div>
    )
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Title</th>
            <th>Description</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {highlights.map((h) => (
            <tr
              key={h.id}
              onClick={() => onSelect(h.id)}
              className={selectedId === h.id ? 'admin-row-selected' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Week {h.week_number}</td>
              <td>{h.title || '-'}</td>
              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.description.replace(/<[^>]*>/g, '').slice(0, 80)}
                {h.description.length > 80 ? '...' : ''}
              </td>
              <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                {new Date(h.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
