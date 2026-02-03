'use client'

import { useState, useEffect, useCallback } from 'react'

interface OverviewData {
  companies: { total: number; byStatus: Record<string, number>; withErrors: number }
  roles: { total: number; byStatus: Record<string, number> }
  engineers: { total: number; byStatus: Record<string, number> }
  matches: { total: number; pending: number; movedForward: number; passed: number; avgScore: number | null }
  feedback: { total: number; hired: number; avgRating: number | null }
  jdViews: number
  recentActivity: {
    recentMatches: { id: string; roleName: string; engineerName: string; score: number | null; createdAt: string }[]
    recentDecisions: { id: string; roleName: string; engineerName: string; decision: string; decisionAt: string }[]
    recentEngineers: { id: string; name: string; status: string; createdAt: string }[]
  }
  attention: {
    crawlErrors: { id: string; name: string; type: 'company' | 'engineer'; error: string }[]
    rolesWithoutMatches: { id: string; title: string; status: string }[]
    stalePendingMatches: number
  }
}

function StatusBreakdown({ byStatus }: { byStatus: Record<string, number> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      {Object.entries(byStatus).map(([status, count]) => (
        <span key={status} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>
          {status}: {count}
        </span>
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDecision(decision: string) {
  if (decision === 'moved_forward') return 'Moved Forward'
  if (decision === 'passed') return 'Passed'
  return decision
}

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

  const hasAttentionItems =
    data.attention.crawlErrors.length > 0 ||
    data.attention.rolesWithoutMatches.length > 0 ||
    data.attention.stalePendingMatches > 0

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Header */}
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Hiring Spa</h1>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="window">
            <div className="window-title">Companies</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.companies.total}</div>
              <StatusBreakdown byStatus={data.companies.byStatus} />
              {data.companies.withErrors > 0 && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error, #c00)', marginTop: 'var(--space-1)' }}>
                  {data.companies.withErrors} with crawl errors
                </div>
              )}
            </div>
          </div>

          <div className="window">
            <div className="window-title">Roles</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.roles.total}</div>
              <StatusBreakdown byStatus={data.roles.byStatus} />
            </div>
          </div>

          <div className="window">
            <div className="window-title">Engineers</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.engineers.total}</div>
              <StatusBreakdown byStatus={data.engineers.byStatus} />
            </div>
          </div>

          <div className="window">
            <div className="window-title">Matches</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.matches.total}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>pending: {data.matches.pending}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>moved forward: {data.matches.movedForward}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>passed: {data.matches.passed}</span>
              </div>
              {data.matches.avgScore != null && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
                  avg score: {data.matches.avgScore}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extra stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="window">
            <div className="window-title">Feedback</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.feedback.total}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>hired: {data.feedback.hired}</span>
                {data.feedback.avgRating != null && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>avg rating: {data.feedback.avgRating}</span>
                )}
              </div>
            </div>
          </div>

          <div className="window">
            <div className="window-title">JD Page Views</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.jdViews}</div>
            </div>
          </div>
        </div>

        {/* Attention Items */}
        {hasAttentionItems && (
          <div className="window">
            <div className="window-title">Needs Attention</div>
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {data.attention.crawlErrors.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                    Crawl Errors ({data.attention.crawlErrors.length})
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attention.crawlErrors.map((item) => (
                          <tr key={`${item.type}-${item.id}`}>
                            <td>{item.name}</td>
                            <td>{item.type}</td>
                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.attention.rolesWithoutMatches.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                    Active Roles Without Matches ({data.attention.rolesWithoutMatches.length})
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attention.rolesWithoutMatches.map((role) => (
                          <tr key={role.id}>
                            <td>{role.title}</td>
                            <td>{role.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.attention.stalePendingMatches > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    Stale Pending Matches: {data.attention.stalePendingMatches}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>
                    Matches pending for more than 7 days without a decision
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Recent Matches */}
          <div className="window">
            <div className="window-title">Recent Matches</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Engineer</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.recentMatches.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: 'var(--color-slate)' }}>No matches yet</td></tr>
                  ) : (
                    data.recentActivity.recentMatches.map((m) => (
                      <tr key={m.id}>
                        <td>{m.roleName}</td>
                        <td>{m.engineerName}</td>
                        <td>{m.score ?? '—'}</td>
                        <td>{formatDate(m.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Decisions */}
          <div className="window">
            <div className="window-title">Recent Decisions</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Engineer</th>
                    <th>Decision</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.recentDecisions.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: 'var(--color-slate)' }}>No decisions yet</td></tr>
                  ) : (
                    data.recentActivity.recentDecisions.map((d) => (
                      <tr key={d.id}>
                        <td>{d.roleName}</td>
                        <td>{d.engineerName}</td>
                        <td>{formatDecision(d.decision)}</td>
                        <td>{formatDate(d.decisionAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Engineers */}
          <div className="window">
            <div className="window-title">Recent Engineers</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.recentEngineers.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: 'var(--color-slate)' }}>No engineers yet</td></tr>
                  ) : (
                    data.recentActivity.recentEngineers.map((e) => (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{e.status}</td>
                        <td>{formatDate(e.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
