'use client'

import { useState, useEffect, useCallback } from 'react'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

interface OverviewData {
  engineers: { id: string; name: string; email: string; status: string; stage: string; questionnaireCompletedAt: string | null; createdAt: string }[]
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

const STAGE_ORDER = ['Applied', 'Got Matches', 'Questionnaire Completed', 'Questionnaire Started', 'Profile Crawled', 'Signed Up']

function stageBadgeColor(stage: string): { bg: string; color: string } {
  switch (stage) {
    case 'Applied': return { bg: 'rgba(122,158,122,0.15)', color: '#5a8a5a' }
    case 'Got Matches': return { bg: c.honeyLight, color: c.match }
    case 'Questionnaire Completed': return { bg: c.honeyLight, color: c.match }
    case 'Questionnaire Started': return { bg: c.stoneLight, color: c.graphite }
    case 'Profile Crawled': return { bg: c.stoneLight, color: c.mist }
    default: return { bg: c.stoneLight, color: c.mist }
  }
}

const label: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.honey, marginBottom: 16,
}

const heading: React.CSSProperties = {
  fontFamily: f.serif, fontSize: 28, fontWeight: 400,
  color: c.charcoal, margin: 0, letterSpacing: '-0.01em',
}

const card: React.CSSProperties = {
  backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
  borderRadius: 8,
}

const cardTitle: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.mist,
  padding: '16px 24px', borderBottom: `1px solid ${c.stoneLight}`,
}

const statValue: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 28, fontWeight: 500, color: c.match,
}

const statLabel: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.mist, marginTop: 4,
}

const th: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.mist, fontWeight: 400,
  padding: '12px 16px', textAlign: 'left',
  borderBottom: `1px solid ${c.stoneLight}`,
}

const td: React.CSSProperties = {
  fontFamily: f.serif, fontSize: 14, color: c.charcoal,
  padding: '12px 16px', borderBottom: `1px solid ${c.stoneLight}`,
}

const tdMono: React.CSSProperties = {
  ...td, fontFamily: f.mono, fontSize: 12, color: c.graphite,
}

const badge = (bg: string, color: string): React.CSSProperties => ({
  fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '5px 10px', borderRadius: 4,
  backgroundColor: bg, color, display: 'inline-block',
})

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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Pipeline</h1>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist, marginTop: 12 }}>Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Pipeline</h1>
        <div style={{ ...card, padding: 32, marginTop: 24 }}>
          <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite }}>{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  const { engineers, applications } = data

  // Count engineers per stage for summary
  const stageCounts: Record<string, number> = {}
  for (const eng of engineers) {
    stageCounts[eng.stage] = (stageCounts[eng.stage] || 0) + 1
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 48, WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <p style={label}>Admin</p>
      <h1 style={{ ...heading, marginBottom: 8 }}>Engineer Pipeline</h1>
      <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 40px 0' }}>
        {engineers.length} engineers across the funnel
      </p>

      {/* Funnel Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
        {STAGE_ORDER.map((stage) => {
          const count = stageCounts[stage] || 0
          const colors = stageBadgeColor(stage)
          return (
            <div key={stage} style={{ ...card, padding: '16px 20px', flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontFamily: f.mono, fontSize: 24, fontWeight: 500, color: colors.color }}>{count}</div>
              <div style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist, marginTop: 4 }}>{stage}</div>
            </div>
          )
        })}
      </div>

      {/* Engineers Table */}
      <div style={{ ...card, marginBottom: 40 }}>
        <div style={cardTitle}>Engineers ({engineers.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Stage</th>
                <th style={th}>Questionnaire</th>
                <th style={th}>Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {engineers.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, color: c.mist }}>No engineers yet</td></tr>
              ) : (
                engineers.map((eng) => {
                  const colors = stageBadgeColor(eng.stage)
                  return (
                    <tr key={eng.id}>
                      <td style={td}>{eng.name}</td>
                      <td style={tdMono}>{eng.email}</td>
                      <td style={td}><span style={badge(colors.bg, colors.color)}>{eng.stage}</span></td>
                      <td style={tdMono}>{eng.questionnaireCompletedAt ? formatDate(eng.questionnaireCompletedAt) : '\u2014'}</td>
                      <td style={tdMono}>{formatDate(eng.createdAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 40 }}>
        {[
          { value: applications.total, label: 'Total Applications' },
          { value: applications.uniqueEngineers, label: 'Engineers Applied' },
          { value: applications.thisWeek, label: 'This Week' },
          { value: applications.thisMonth, label: 'This Month' },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: '20px 24px', textAlign: 'center' }}>
            <div style={statValue}>{s.value}</div>
            <div style={statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Applications by Engineer */}
      <div style={{ ...card, marginBottom: 40 }}>
        <div style={cardTitle}>Applications by Engineer</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Applications</th>
                <th style={th}>Last Applied</th>
              </tr>
            </thead>
            <tbody>
              {applications.byEngineer.length === 0 ? (
                <tr><td colSpan={4} style={{ ...td, color: c.mist }}>No applications yet</td></tr>
              ) : (
                applications.byEngineer.map((eng) => (
                  <tr key={eng.email}>
                    <td style={td}>{eng.name}</td>
                    <td style={tdMono}>{eng.email}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={badge(c.honeyLight, c.match)}>{eng.count}</span>
                    </td>
                    <td style={tdMono}>{formatDate(eng.lastAppliedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Applications */}
      <div style={card}>
        <div style={cardTitle}>All Applications</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Engineer</th>
                <th style={th}>Company</th>
                <th style={th}>Role</th>
                <th style={th}>Location</th>
                <th style={th}>Applied</th>
                <th style={th}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {applications.list.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, color: c.mist }}>No applications yet</td></tr>
              ) : (
                applications.list.map((app) => (
                  <tr key={app.id}>
                    <td style={td}>{app.engineerName}</td>
                    <td style={td}>{app.companyName}</td>
                    <td style={td}>{app.jobTitle}</td>
                    <td style={tdMono}>{app.location || '\u2014'}</td>
                    <td style={tdMono}>{formatDate(app.appliedAt)}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.feedback || '\u2014'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
