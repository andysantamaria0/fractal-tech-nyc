'use client'

import { useState, useEffect, useCallback } from 'react'

interface OverviewData {
  funnel: {
    signedUp: number
    profileCrawled: number
    questionnaireStarted: number
    questionnaireCompleted: number
    gotMatches: number
    applied: number
  }
  applications: {
    total: number
    uniqueEngineers: number
    thisWeek: number
    thisMonth: number
    byEngineer: { name: string; email: string; count: number; lastAppliedAt: string }[]
    list: { id: string; engineerName: string; engineerEmail: string; companyName: string; jobTitle: string; location: string; appliedAt: string; feedback: string | null }[]
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const FUNNEL_STEPS = [
  { key: 'signedUp', label: 'Signed Up' },
  { key: 'profileCrawled', label: 'Profile Crawled' },
  { key: 'questionnaireStarted', label: 'Questionnaire Started' },
  { key: 'questionnaireCompleted', label: 'Questionnaire Completed' },
  { key: 'gotMatches', label: 'Got Matches' },
  { key: 'applied', label: 'Applied' },
] as const

export default function AdminHiringSpaPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/hiring-spa/overview')
      if (!res.ok) throw new Error('Failed to fetch overview')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Failed to load hiring spa overview:', e)
      setError('Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-grid">
          <div>
            <div className="section-label">Admin</div>
            <h1 className="section-title">Hiring Spa</h1>
          </div>
          <div className="loading-text">Loading overview...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="dashboard">
        <div className="dashboard-grid">
          <div>
            <div className="section-label">Admin</div>
            <h1 className="section-title">Hiring Spa</h1>
          </div>
          <div className="window">
            <div style={{ padding: 'var(--space-5)', color: 'var(--color-slate)' }}>
              {error || 'No data available'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { funnel, applications } = data
  const topOfFunnel = funnel.signedUp || 1

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Header */}
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Hiring Spa</h1>
        </div>

        {/* Engineer Funnel */}
        <div className="window">
          <div className="window-title">Engineer Funnel</div>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {FUNNEL_STEPS.map((step, i) => {
              const count = funnel[step.key]
              const pct = Math.round((count / topOfFunnel) * 100)
              const prevCount = i > 0 ? funnel[FUNNEL_STEPS[i - 1].key] : null
              const dropoff = prevCount && prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : null
              return (
                <div key={step.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{step.label}</span>
                    <span style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline' }}>
                      {dropoff !== null && dropoff > 0 && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>
                          -{dropoff}%
                        </span>
                      )}
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{count}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border, #e2e2e2)' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: 'var(--color-primary, #000)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Application Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="window">
            <div className="window-title">Total Applications</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{applications.total}</div>
            </div>
          </div>

          <div className="window">
            <div className="window-title">Engineers Applied</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{applications.uniqueEngineers}</div>
            </div>
          </div>

          <div className="window">
            <div className="window-title">This Week</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{applications.thisWeek}</div>
            </div>
          </div>

          <div className="window">
            <div className="window-title">This Month</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{applications.thisMonth}</div>
            </div>
          </div>
        </div>

        {/* Applications by Engineer */}
        <div className="window">
          <div className="window-title">Applications by Engineer</div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Applications</th>
                  <th>Last Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.byEngineer.length === 0 ? (
                  <tr><td colSpan={4} style={{ color: 'var(--color-slate)' }}>No applications yet</td></tr>
                ) : (
                  applications.byEngineer.map((eng) => (
                    <tr key={eng.email}>
                      <td>{eng.name}</td>
                      <td>{eng.email}</td>
                      <td>{eng.count}</td>
                      <td>{formatDate(eng.lastAppliedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Applications */}
        <div className="window">
          <div className="window-title">All Applications</div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Engineer</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Applied</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {applications.list.length === 0 ? (
                  <tr><td colSpan={6} style={{ color: 'var(--color-slate)' }}>No applications yet</td></tr>
                ) : (
                  applications.list.map((app) => (
                    <tr key={app.id}>
                      <td>{app.engineerName}</td>
                      <td>{app.companyName}</td>
                      <td>{app.jobTitle}</td>
                      <td>{app.location || '—'}</td>
                      <td>{formatDate(app.appliedAt)}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.feedback || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
