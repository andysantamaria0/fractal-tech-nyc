'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'
import type { DimensionWeights } from '@/lib/hiring-spa/types'

interface MatchReasoning {
  mission: string
  technical: string
  culture: string
  environment: string
  dna: string
}

interface MatchRow {
  id: string
  displayRank: number | null
  overallScore: number
  dimensionScores: DimensionWeights
  feedback: string | null
  feedbackCategory: string | null
  feedbackAt: string | null
  appliedAt: string | null
  createdAt: string
  jobTitle: string
  companyName: string
  jobUrl: string | null
  location: string | null
  reasoning: MatchReasoning | null
  highlightQuote: string | null
}

interface MatchesData {
  engineer: { id: string; name: string; email: string }
  matches: MatchRow[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

const statValue: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 28, fontWeight: 500, color: c.match,
}

const statLabel: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.mist, marginTop: 4,
}

const badge = (bg: string, color: string): React.CSSProperties => ({
  fontFamily: f.mono, fontSize: 9, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '5px 10px', borderRadius: 4,
  backgroundColor: bg, color, display: 'inline-block',
})

function feedbackBadge(match: MatchRow) {
  if (match.feedback === 'applied') {
    return <span style={badge('rgba(122,158,122,0.15)', '#5a8a5a')}>Applied</span>
  }
  if (match.feedback === 'not_a_fit') {
    return <span style={badge(c.stoneLight, c.mist)}>Not a Fit</span>
  }
  return <span style={{ fontFamily: f.mono, fontSize: 12, color: c.mist }}>&mdash;</span>
}

function scoreCell(score: number) {
  return (
    <td style={{ ...tdMono, textAlign: 'center' }}>
      {Math.round(score)}
    </td>
  )
}

export default function AdminEngineerMatchesPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<MatchesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/hiring-spa/engineers/${id}/matches`)
      if (!res.ok) throw new Error('Failed to fetch matches')
      setData(await res.json())
    } catch {
      setError('Failed to load matches data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Matches</h1>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist, marginTop: 12 }}>Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
        <p style={label}>Admin</p>
        <h1 style={heading}>Engineer Matches</h1>
        <div style={{ ...card, padding: 32, marginTop: 24 }}>
          <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite }}>{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  const { engineer, matches } = data
  const appliedCount = matches.filter((m) => m.feedback === 'applied').length
  const notAFitCount = matches.filter((m) => m.feedback === 'not_a_fit').length
  const pendingCount = matches.filter((m) => !m.feedback).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48, WebkitFontSmoothing: 'antialiased' }}>
      {/* Back link */}
      <Link
        href="/admin/hiring-spa"
        style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.06em', color: c.mist, textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        &larr; Back to Pipeline
      </Link>

      {/* Header */}
      <p style={label}>Admin</p>
      <h1 style={{ ...heading, marginBottom: 4 }}>{engineer.name}</h1>
      <p style={{ fontFamily: f.mono, fontSize: 12, color: c.graphite, margin: '0 0 32px 0' }}>{engineer.email}</p>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
        {[
          { value: matches.length, label: 'Total Matches', color: c.match },
          { value: appliedCount, label: 'Applied', color: '#5a8a5a' },
          { value: notAFitCount, label: 'Not a Fit', color: c.mist },
          { value: pendingCount, label: 'Pending Review', color: c.honey },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: '16px 20px', flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
            <div style={{ ...statValue, color: s.color }}>{s.value}</div>
            <div style={statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Matches Table */}
      <div style={{ ...card, marginBottom: 40 }}>
        <div style={cardTitle}>Matches ({matches.length})</div>
        <div style={{ overflowX: 'auto' }}>
          {matches.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist }}>No matches computed yet for this engineer.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'center', width: 50 }}>Rank</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Company</th>
                  <th style={th}>Location</th>
                  <th style={{ ...th, textAlign: 'center' }}>Overall</th>
                  <th style={{ ...th, textAlign: 'center' }}>Mission</th>
                  <th style={{ ...th, textAlign: 'center' }}>Tech</th>
                  <th style={{ ...th, textAlign: 'center' }}>Culture</th>
                  <th style={{ ...th, textAlign: 'center' }}>Env</th>
                  <th style={{ ...th, textAlign: 'center' }}>DNA</th>
                  <th style={th}>Feedback</th>
                  <th style={th}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
                  const isExpanded = expandedId === m.id
                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        style={{ cursor: 'pointer', transition: 'background-color 150ms ease' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <td style={{ ...tdMono, textAlign: 'center' }}>{m.displayRank ?? i + 1}</td>
                        <td style={td}>
                          {m.jobUrl ? (
                            <a
                              href={m.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ color: c.charcoal, textDecoration: 'underline', textUnderlineOffset: 2 }}
                            >
                              {m.jobTitle}
                            </a>
                          ) : m.jobTitle}
                        </td>
                        <td style={td}>{m.companyName}</td>
                        <td style={tdMono}>{m.location || '\u2014'}</td>
                        <td style={{ ...tdMono, textAlign: 'center', fontWeight: 600 }}>
                          {Math.round(m.overallScore)}
                        </td>
                        {scoreCell(m.dimensionScores.mission)}
                        {scoreCell(m.dimensionScores.technical)}
                        {scoreCell(m.dimensionScores.culture)}
                        {scoreCell(m.dimensionScores.environment)}
                        {scoreCell(m.dimensionScores.dna)}
                        <td style={td}>{feedbackBadge(m)}</td>
                        <td style={tdMono}>{m.appliedAt ? formatDate(m.appliedAt) : '\u2014'}</td>
                      </tr>
                      {isExpanded && (m.reasoning || m.highlightQuote) && (
                        <tr>
                          <td colSpan={12} style={{ padding: '0 16px 16px 16px', backgroundColor: 'rgba(0,0,0,0.015)' }}>
                            {m.highlightQuote && (
                              <p style={{
                                fontFamily: f.serif, fontSize: 14, fontStyle: 'italic',
                                color: c.charcoal, margin: '16px 0 12px 0', lineHeight: 1.6,
                              }}>
                                &ldquo;{m.highlightQuote}&rdquo;
                              </p>
                            )}
                            {m.reasoning && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 12 }}>
                                {(['mission', 'technical', 'culture', 'environment', 'dna'] as const).map(dim => (
                                  <div key={dim} style={{ padding: '8px 0' }}>
                                    <span style={{
                                      fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
                                      textTransform: 'uppercase', color: c.honey,
                                    }}>
                                      {dim} ({Math.round(m.dimensionScores[dim])})
                                    </span>
                                    <p style={{
                                      fontFamily: f.serif, fontSize: 13, color: c.graphite,
                                      margin: '4px 0 0 0', lineHeight: 1.5,
                                    }}>
                                      {m.reasoning[dim]}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
