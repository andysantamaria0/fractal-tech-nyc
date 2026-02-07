'use client'

import { useState, useEffect } from 'react'
import type { Engineer } from '@/lib/types'

const PAGE_SIZE = 20

interface EngineerWithInterest extends Engineer {
  interest_count?: number
}

interface EngineersTableProps {
  engineers: EngineerWithInterest[]
  onSelect: (id: string) => void
  selectedId?: string
  onToggleAvailability: (id: string, available: boolean) => void
}

export default function EngineersTable({ engineers, onSelect, selectedId, onToggleAvailability }: EngineersTableProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(engineers.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const pageEngineers = engineers.slice(start, start + PAGE_SIZE)

  // Reset to page 1 if filters change and current page is out of range
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1)
    }
  }, [page, totalPages])

  if (engineers.length === 0) {
    return (
      <div className="loading-text" style={{ padding: 'var(--space-7)' }}>
        No engineers match these filters.
      </div>
    )
  }

  return (
    <>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Focus Areas</th>
              <th>Hours/wk</th>
              <th>Interests</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {pageEngineers.map((eng) => (
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
                  {eng.interest_count ? (
                    <span className="admin-flag" style={{ borderColor: 'var(--color-primary, #2563EB)', color: 'var(--color-primary, #2563EB)' }}>
                      {eng.interest_count}
                    </span>
                  ) : '-'}
                </td>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, engineers.length)} of {engineers.length}
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
            >
              Previous
            </button>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  )
}
