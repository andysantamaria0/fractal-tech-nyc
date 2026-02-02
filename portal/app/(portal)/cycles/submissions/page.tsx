'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Submission } from '@/lib/types'
import { getStatusColor } from '@/lib/constants'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('feature_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Cycles</div>
          <h1 className="section-title">My Submissions</h1>
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Track the status of your feature requests.
          </p>
        </div>

        {loading ? (
          <div className="window">
            <div className="window-title">Loading...</div>
            <div className="window-content">
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '75%' }} />
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="window">
            <div className="window-title">No Submissions Yet</div>
            <div className="window-content" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-5)' }}>
                You haven&apos;t submitted any feature requests yet.
              </p>
              <Link href="/cycles/submit" className="btn-primary">
                Submit a Feature
              </Link>
            </div>
          </div>
        ) : (
          <>
            {submissions.map((sub) => (
              <div key={sub.id} className="window">
                <div className="window-title" style={{ justifyContent: 'space-between' }}>
                  <span>{sub.title}</span>
                  <span
                    className="admin-status-badge"
                    style={{ borderColor: getStatusColor(sub.status), color: getStatusColor(sub.status) }}
                  >
                    {sub.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="window-content">
                  <p style={{ marginBottom: 'var(--space-4)', whiteSpace: 'pre-wrap' }}>{sub.description}</p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    <div className="cohort-stat">Timeline: {sub.timeline.replace(/-/g, ' ')}</div>
                    {sub.tech_stack && <div className="cohort-stat">Tech: {sub.tech_stack}</div>}
                    <div className="cohort-stat">Hiring: {sub.is_hiring ? 'Yes' : 'No'}</div>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Submitted {formatDate(sub.created_at)}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center' }}>
              <Link href="/cycles/submit" className="btn-secondary">
                Submit Another Feature
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
