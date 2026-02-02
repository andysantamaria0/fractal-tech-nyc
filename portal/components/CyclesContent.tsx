'use client'

import { useState } from 'react'
import EngineerCard from '@/components/EngineerCard'
import type { Engineer } from '@/lib/types'

const PAGE_SIZE = 20

interface CyclesContentProps {
  engineers: Engineer[]
  interestedIds: string[]
}

export default function CyclesContent({ engineers, interestedIds }: CyclesContentProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(engineers.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const pageEngineers = engineers.slice(start, start + PAGE_SIZE)

  return (
    <>
      <div className="engineers-grid">
        {pageEngineers.map((engineer) => (
          <EngineerCard
            key={engineer.id}
            engineer={engineer}
            interested={interestedIds.includes(engineer.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
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
      )}
    </>
  )
}
