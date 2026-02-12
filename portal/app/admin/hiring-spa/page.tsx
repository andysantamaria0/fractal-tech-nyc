'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

// --- Types ---

interface OverviewData {
  engineers: {
    id: string; name: string; email: string; status: string; stage: string; stageIndex: number
    questionnaireCompletedAt: string | null; crawlCompletedAt: string | null; createdAt: string
  }[]
  funnelCounts: Record<string, number>
  applicationCount: number
  applications: {
    total: number; uniqueEngineers: number; thisWeek: number; thisMonth: number
    byEngineer: { name: string; email: string; count: number; lastAppliedAt: string }[]
    list: { id: string; engineerName: string; engineerEmail: string; companyName: string; jobTitle: string; location: string; appliedAt: string; feedback: string | null }[]
  }
  matches: {
    total: number
    byStatus: { pending: number; applied: number; notAFit: number }
    avgScore: number; avgScoreApplied: number | null; avgScoreDismissed: number | null
    dismissalReasons: { category: string; count: number }[]
    byEngineer: { name: string; email: string; engineerId: string; total: number; applied: number; notAFit: number; pending: number; avgScore: number; lastAppliedAt: string | null; matchesComputedAt: string | null }[]
    list: { id: string; engineerName: string; engineerEmail: string; companyName: string; jobTitle: string; location: string; overallScore: number; feedback: string | null; feedbackCategory: string | null; appliedAt: string | null; feedbackAt: string | null; createdAt: string }[]
  }
}

interface ActivityEvent {
  type: 'signup' | 'questionnaire' | 'matches_received' | 'applied' | 'dismissed'
  engineerName: string
  timestamp: string
  detail?: string
}

// --- Helpers ---

function timeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysInStage(eng: OverviewData['engineers'][number], matchData?: { lastAppliedAt: string | null; matchesComputedAt: string | null }): number {
  const now = Date.now()
  switch (eng.stage) {
    case 'Applied':
      return Math.floor((now - new Date(matchData?.lastAppliedAt || eng.createdAt).getTime()) / 86400000)
    case 'Got Matches':
      return Math.floor((now - new Date(matchData?.matchesComputedAt || eng.questionnaireCompletedAt || eng.createdAt).getTime()) / 86400000)
    case 'Questionnaire Completed':
      return Math.floor((now - new Date(eng.questionnaireCompletedAt || eng.createdAt).getTime()) / 86400000)
    case 'Profile Crawled':
      return Math.floor((now - new Date(eng.crawlCompletedAt || eng.createdAt).getTime()) / 86400000)
    default:
      return Math.floor((now - new Date(eng.createdAt).getTime()) / 86400000)
  }
}

function buildActivityFeed(data: OverviewData): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const eng of data.engineers) {
    events.push({ type: 'signup', engineerName: eng.name, timestamp: eng.createdAt })
    if (eng.questionnaireCompletedAt) {
      events.push({ type: 'questionnaire', engineerName: eng.name, timestamp: eng.questionnaireCompletedAt })
    }
  }

  // Group matches received by engineer + day
  const matchGroups: Record<string, { name: string; count: number; timestamp: string }> = {}
  for (const m of data.matches.list) {
    const day = m.createdAt.slice(0, 10)
    const key = `${m.engineerEmail}-${day}`
    if (!matchGroups[key]) {
      matchGroups[key] = { name: m.engineerName, count: 0, timestamp: m.createdAt }
    }
    matchGroups[key].count++
    if (m.createdAt > matchGroups[key].timestamp) matchGroups[key].timestamp = m.createdAt
  }
  for (const group of Object.values(matchGroups)) {
    events.push({
      type: 'matches_received', engineerName: group.name, timestamp: group.timestamp,
      detail: `${group.count} match${group.count !== 1 ? 'es' : ''}`,
    })
  }

  for (const m of data.matches.list) {
    if (m.feedback === 'applied' && m.appliedAt) {
      events.push({ type: 'applied', engineerName: m.engineerName, timestamp: m.appliedAt, detail: `${m.jobTitle} at ${m.companyName}` })
    }
    if (m.feedback === 'not_a_fit') {
      events.push({ type: 'dismissed', engineerName: m.engineerName, timestamp: m.feedbackAt || m.createdAt, detail: `${m.companyName} \u2014 ${m.jobTitle}` })
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// --- Styles ---

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

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '5px 10px', borderRadius: 4,
  backgroundColor: bg, color, display: 'inline-block',
})

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

const EVENT_COLORS: Record<ActivityEvent['type'], string> = {
  signup: c.mist,
  questionnaire: c.match,
  matches_received: c.honey,
  applied: '#5a8a5a',
  dismissed: '#b44',
}

const FUNNEL_STAGES = ['Signed Up', 'Questionnaire Completed', 'Got Matches', 'Applied'] as const

// --- Component ---

export default function AdminHiringSpaPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matchState, setMatchState] = useState<Record<string, 'computing' | 'done' | 'error'>>({})
  const [matchResult, setMatchResult] = useState<Record<string, string>>({})

  async function computeMatches(engineerId: string) {
    setMatchState((prev) => ({ ...prev, [engineerId]: 'computing' }))
    setMatchResult((prev) => { const next = { ...prev }; delete next[engineerId]; return next })
    try {
      const res = await fetch(`/api/admin/hiring-spa/engineers/${engineerId}/matches`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to compute matches')
      setMatchState((prev) => ({ ...prev, [engineerId]: 'done' }))
      setMatchResult((prev) => ({ ...prev, [engineerId]: `${body.matchCount} matches` }))
      loadData(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to compute matches'
      setMatchState((prev) => ({ ...prev, [engineerId]: 'error' }))
      setMatchResult((prev) => ({ ...prev, [engineerId]: msg }))
    }
  }

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Pipeline</h1>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist, marginTop: 12 }}>Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Pipeline</h1>
        <div style={{ ...card, padding: 32, marginTop: 24 }}>
          <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite }}>{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  const { engineers, funnelCounts, matches } = data
  const feed = buildActivityFeed(data)

  // Merge engineer rows with match-by-engineer data
  const matchByEngId = new Map(matches.byEngineer.map((m) => [m.engineerId, m]))
  const mergedEngineers = engineers.map((eng) => {
    const md = matchByEngId.get(eng.id)
    const days = daysInStage(eng, md)
    const timestamps = [eng.createdAt, eng.questionnaireCompletedAt, eng.crawlCompletedAt, md?.lastAppliedAt, md?.matchesComputedAt].filter(Boolean) as string[]
    const lastActive = timestamps.reduce((latest, ts) => (ts > latest ? ts : latest), eng.createdAt)
    // stageIndex <= 3 means pre-match (Signed Up, Profile Crawled, Questionnaire Started, Questionnaire Completed)
    const isStale = days > 7 && eng.stageIndex <= 3
    return {
      ...eng,
      matches: md?.total ?? 0,
      applied: md?.applied ?? 0,
      pending: md?.pending ?? 0,
      avgScore: md ? md.avgScore : null,
      daysInStage: days,
      lastActive,
      isStale,
    }
  }).sort((a, b) => {
    if (a.isStale !== b.isStale) return a.isStale ? -1 : 1
    return b.stageIndex - a.stageIndex
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48, WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <p style={label}>Admin</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h1 style={heading}>Engineer Pipeline</h1>
        <Link
          href="/admin/hiring-spa/adhoc-match"
          style={{
            fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '8px 16px', borderRadius: 4,
            backgroundColor: c.charcoal, color: c.fog, textDecoration: 'none',
          }}
        >
          Ad-Hoc JD Match
        </Link>
      </div>
      <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 40px 0' }}>
        {engineers.length} engineers across the funnel
      </p>

      {/* Section 1: Pipeline Funnel — 4 stages with conversion rates */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        {FUNNEL_STAGES.map((stage, i) => {
          const count = funnelCounts[stage] || 0
          const prevCount = i > 0 ? (funnelCounts[FUNNEL_STAGES[i - 1]] || 0) : 0
          const convRate = i > 0 && prevCount > 0 ? Math.round((count / prevCount) * 100) : null
          return (
            <Fragment key={stage}>
              {convRate !== null && (
                <div style={{ fontFamily: f.mono, fontSize: 11, color: c.mist, padding: '0 10px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{'\u2192'}</div>
                  {convRate}%
                </div>
              )}
              <div style={{ ...card, padding: '20px 24px', flex: 1, textAlign: 'center', minWidth: 0 }}>
                <div style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 500, color: c.charcoal }}>{count}</div>
                <div style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist, marginTop: 4 }}>{stage}</div>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* Section 2 + 3: Activity Feed (left) + Engineers Table (right) */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 40, alignItems: 'flex-start' }}>

        {/* Activity Feed */}
        <div style={{ ...card, width: 340, minWidth: 340, flexShrink: 0 }}>
          <div style={cardTitle}>Activity</div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {feed.length === 0 ? (
              <div style={{ padding: '16px 24px', fontFamily: f.serif, fontSize: 13, color: c.mist }}>No activity yet</div>
            ) : (
              feed.map((event, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 24px', gap: 10 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: EVENT_COLORS[event.type],
                    flexShrink: 0, marginTop: 6, display: 'inline-block',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: f.serif, fontSize: 13, color: c.charcoal }}>{event.engineerName}</span>
                    {' '}
                    <span style={{ fontFamily: f.serif, fontSize: 13, color: c.mist }}>
                      {event.type === 'signup' && 'signed up'}
                      {event.type === 'questionnaire' && 'completed questionnaire'}
                      {event.type === 'matches_received' && `received ${event.detail}`}
                      {event.type === 'applied' && `applied to ${event.detail}`}
                      {event.type === 'dismissed' && `dismissed ${event.detail}`}
                    </span>
                  </div>
                  <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Engineers Table */}
        <div style={{ ...card, flex: 1, minWidth: 0 }}>
          <div style={cardTitle}>Engineers ({engineers.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Stage</th>
                  <th style={{ ...th, textAlign: 'center' }}>Days</th>
                  <th style={{ ...th, textAlign: 'center' }}>Matches</th>
                  <th style={{ ...th, textAlign: 'center' }}>Applied</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pending</th>
                  <th style={{ ...th, textAlign: 'center' }}>Avg Score</th>
                  <th style={th}>Last Active</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {mergedEngineers.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td, color: c.mist }}>No engineers yet</td></tr>
                ) : (
                  mergedEngineers.map((eng) => {
                    const colors = stageBadgeColor(eng.stage)
                    return (
                      <tr key={eng.id} style={eng.isStale ? { backgroundColor: 'rgba(201,168,108,0.08)' } : undefined}>
                        <td style={td}>
                          <Link href={`/admin/hiring-spa/engineers/${eng.id}/matches`} style={{ color: c.charcoal, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                            {eng.name}
                          </Link>
                        </td>
                        <td style={td}><span style={badgeStyle(colors.bg, colors.color)}>{eng.stage}</span></td>
                        <td style={{ ...tdMono, textAlign: 'center' }}>{eng.daysInStage}</td>
                        <td style={{ ...tdMono, textAlign: 'center' }}>{eng.matches || '\u2014'}</td>
                        <td style={{ ...tdMono, textAlign: 'center' }}>{eng.applied || '\u2014'}</td>
                        <td style={{ ...tdMono, textAlign: 'center' }}>{eng.pending || '\u2014'}</td>
                        <td style={{ ...tdMono, textAlign: 'center' }}>{eng.avgScore ?? '\u2014'}</td>
                        <td style={tdMono}>{timeAgo(eng.lastActive)}</td>
                        <td style={td}>
                          {eng.questionnaireCompletedAt && eng.status === 'complete' && (() => {
                            const state = matchState[eng.id]
                            if (state === 'computing') return (
                              <span style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.match }}>
                                Computing...
                              </span>
                            )
                            if (state === 'done') return (
                              <span style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5a8a5a' }}>
                                {matchResult[eng.id]}
                              </span>
                            )
                            if (state === 'error') return (
                              <span style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b44', maxWidth: 120, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {matchResult[eng.id] || 'Error'}
                              </span>
                            )
                            return (
                              <button
                                onClick={() => computeMatches(eng.id)}
                                style={{
                                  fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em',
                                  textTransform: 'uppercase', padding: '5px 10px', borderRadius: 4,
                                  backgroundColor: c.charcoal, color: c.fog,
                                  border: 'none', cursor: 'pointer',
                                }}
                              >
                                {eng.stage === 'Got Matches' || eng.stage === 'Applied' ? 'Recompute' : 'Compute'}
                              </button>
                            )
                          })()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 4: Match Quality */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Match Stats */}
        <div style={{ ...card, flex: 1 }}>
          <div style={cardTitle}>Match Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { value: matches.total, lbl: 'Total', sub: undefined as string | undefined },
              { value: matches.byStatus.applied, lbl: 'Applied', sub: matches.total > 0 ? `${Math.round((matches.byStatus.applied / matches.total) * 100)}%` : undefined },
              { value: matches.byStatus.notAFit, lbl: 'Dismissed', sub: matches.total > 0 ? `${Math.round((matches.byStatus.notAFit / matches.total) * 100)}%` : undefined },
              { value: matches.byStatus.pending, lbl: 'Pending', sub: matches.total > 0 ? `${Math.round((matches.byStatus.pending / matches.total) * 100)}%` : undefined },
              { value: matches.avgScore, lbl: 'Avg Score', sub: undefined as string | undefined },
              { value: matches.avgScoreApplied ?? '\u2014', lbl: 'Avg Applied', sub: undefined as string | undefined },
            ].map((s) => (
              <div key={s.lbl} style={{ padding: '16px 20px', textAlign: 'center', borderBottom: `1px solid ${c.stoneLight}` }}>
                <div style={{ fontFamily: f.mono, fontSize: 22, fontWeight: 500, color: c.match }}>{s.value}</div>
                <div style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist, marginTop: 2 }}>
                  {s.lbl}
                </div>
                {s.sub && <div style={{ fontFamily: f.mono, fontSize: 10, color: c.graphite, marginTop: 1 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dismissal Reasons */}
        <div style={{ ...card, flex: 1 }}>
          <div style={cardTitle}>Dismissal Reasons</div>
          <div style={{ padding: '16px 24px' }}>
            {matches.dismissalReasons.length === 0 ? (
              <div style={{ fontFamily: f.serif, fontSize: 13, color: c.mist }}>No dismissals yet</div>
            ) : (
              matches.dismissalReasons.map((r) => {
                const maxCount = matches.dismissalReasons[0].count
                const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0
                return (
                  <div key={r.category} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: f.mono, fontSize: 11, color: c.graphite, textTransform: 'capitalize' }}>{r.category.replace(/_/g, ' ')}</span>
                      <span style={{ fontFamily: f.mono, fontSize: 11, color: c.mist }}>{r.count}</span>
                    </div>
                    <div style={{ height: 6, backgroundColor: c.stoneLight, borderRadius: 3 }}>
                      <div style={{ height: 6, backgroundColor: c.stone, borderRadius: 3, width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
