'use client'

interface Spotlight {
  id: string
  title: string
  content_type: 'video' | 'text' | 'image' | 'embed'
  content_url?: string
  content_body?: string
  is_active: boolean
  display_order: number
  created_at: string
}

interface SpotlightsTableProps {
  spotlights: Spotlight[]
  onSelect: (id: string) => void
  selectedId?: string
  onToggleActive: (id: string, isActive: boolean) => void
}

const TYPE_COLORS: Record<string, string> = {
  video: 'var(--color-ink)',
  text: 'var(--color-slate)',
  image: 'var(--color-slate)',
  embed: 'var(--color-ink)',
}

export default function SpotlightsTable({ spotlights, onSelect, selectedId, onToggleActive }: SpotlightsTableProps) {
  if (spotlights.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No spotlight items yet. Click &quot;Add Spotlight&quot; to create one.
      </div>
    )
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Active</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {spotlights.map((s) => (
            <tr
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={selectedId === s.id ? 'admin-row-selected' : ''}
              style={{ cursor: 'pointer', opacity: s.is_active ? 1 : 0.5 }}
            >
              <td style={{ fontWeight: 700 }}>{s.title}</td>
              <td>
                <span
                  className="admin-flag"
                  style={{ borderColor: TYPE_COLORS[s.content_type], color: TYPE_COLORS[s.content_type] }}
                >
                  {s.content_type}
                </span>
              </td>
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleActive(s.id, !s.is_active)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: s.is_active ? 'var(--color-ink)' : 'var(--color-slate)',
                  }}
                >
                  {s.is_active ? 'Yes' : 'No'}
                </button>
              </td>
              <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
                {s.display_order}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
