'use client'

import type { Submission } from '@/lib/types'
import { getStatusColor } from '@/lib/constants'

interface CyclesTableProps {
  submissions: Submission[]
  onSelect: (id: string) => void
  selectedId?: string
}

function getFlags(submission: Submission): { label: string; color: string }[] {
  const flags: { label: string; color: string }[] = []
  const now = new Date().toISOString().split('T')[0]

  if (submission.sprint_end_date && submission.sprint_end_date < now && submission.status === 'in_progress') {
    flags.push({ label: 'OVERDUE', color: 'var(--color-error)' })
  }

  if (submission.hours_budget && submission.hours_logged) {
    const pct = submission.hours_logged / submission.hours_budget
    if (pct >= 0.9) {
      flags.push({ label: 'HOURS WARNING', color: 'var(--color-warning, #D97706)' })
    }
  }

  // Stale: submitted more than 7 days ago, still in 'submitted' status
  if (submission.status === 'submitted') {
    const submitted = new Date(submission.created_at)
    const diff = Date.now() - submitted.getTime()
    if (diff > 7 * 24 * 60 * 60 * 1000) {
      flags.push({ label: 'STALE', color: '#9CA3AF' })
    }
  }

  if (submission.is_hiring) {
    flags.push({ label: 'HIRING', color: '#34D399' })
  }

  return flags
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getSprintDay(submission: Submission): string {
  if (!submission.sprint_start_date || submission.status !== 'in_progress') return '-'
  const start = new Date(submission.sprint_start_date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (submission.sprint_end_date) {
    const end = new Date(submission.sprint_end_date)
    const total = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${diff}/${total}`
  }
  return `Day ${diff}`
}

export default function CyclesTable({ submissions, onSelect, selectedId }: CyclesTableProps) {
  if (submissions.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No submissions match these filters.
      </div>
    )
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Feature</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Urgency</th>
            <th>Engineer</th>
            <th>Sprint</th>
            <th>Hours</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const flags = getFlags(sub)
            return (
              <tr
                key={sub.id}
                onClick={() => onSelect(sub.id)}
                className={selectedId === sub.id ? 'admin-row-selected' : ''}
                style={{ cursor: 'pointer' }}
              >
                <td>{sub.profiles?.name || 'Unknown'}</td>
                <td style={{ fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.title}
                </td>
                <td>{formatDate(sub.created_at)}</td>
                <td>
                  <span
                    className="admin-status-badge"
                    style={{ borderColor: getStatusColor(sub.status), color: getStatusColor(sub.status) }}
                  >
                    {sub.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                  {sub.timeline.replace(/-/g, ' ')}
                </td>
                <td>{sub.assigned_engineer?.name || (sub.preferred_engineer ? `(pref: ${sub.preferred_engineer.name})` : '-')}</td>
                <td>{getSprintDay(sub)}</td>
                <td>
                  {sub.hours_budget
                    ? `${sub.hours_logged || 0}/${sub.hours_budget}`
                    : '-'}
                </td>
                <td>
                  {flags.map((f, i) => (
                    <span
                      key={i}
                      className="admin-flag"
                      style={{ borderColor: f.color, color: f.color }}
                    >
                      {f.label}
                    </span>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
