'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'
import type { DimensionWeights, MatchReasoning, ExtractedJD } from '@/lib/hiring-spa/types'

/* ── Local types ──────────────────────────────────────────── */

interface Engineer {
  id: string
  name: string
  email: string
}

interface MatchResult {
  id: string
  engineer_id: string
  jd_url: string
  jd_title: string
  overall_score: number
  dimension_scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string | null
  notes: string | null
  created_at: string
  engineer?: { id: string; name: string; email: string }
}

/* ── Style constants (same as engineers/[id]/matches/page) ── */

const label: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: c.honey, marginBottom: 16,
}
const heading: React.CSSProperties = {
  fontFamily: f.serif, fontSize: 28, fontWeight: 400,
  color: c.charcoal, margin: 0, letterSpacing: '-0.01em',
}
const card: React.CSSProperties = {
  backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`, borderRadius: 8,
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

const btnPrimary: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '10px 20px', borderRadius: 4,
  backgroundColor: c.charcoal, color: c.fog, border: 'none', cursor: 'pointer',
}

const btnDisabled: React.CSSProperties = {
  ...btnPrimary, opacity: 0.4, cursor: 'not-allowed',
}

const inputStyle: React.CSSProperties = {
  fontFamily: f.mono, fontSize: 13, padding: '10px 14px',
  border: `1px solid ${c.stoneBorder}`, borderRadius: 4,
  backgroundColor: '#fff', color: c.charcoal, width: '100%',
  outline: 'none',
}

const DIMENSION_LABELS: { key: keyof DimensionWeights; label: string }[] = [
  { key: 'mission', label: 'Mission' },
  { key: 'technical', label: 'Tech' },
  { key: 'culture', label: 'Culture' },
  { key: 'environment', label: 'Env' },
  { key: 'dna', label: 'DNA' },
]

function scoreColor(score: number): string {
  if (score >= 75) return '#5a8a5a'
  if (score >= 55) return c.match
  return '#b44'
}

/* ── Component ───────────────────────────────────────────── */

export default function AdHocMatchPage() {
  // Extract state
  const [jdUrl, setJdUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractedJD, setExtractedJD] = useState<ExtractedJD | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [showRawText, setShowRawText] = useState(false)

  // Engineer selection
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingEngineers, setLoadingEngineers] = useState(true)

  // Scoring
  const [notes, setNotes] = useState('')
  const [scoring, setScoring] = useState(false)
  const [results, setResults] = useState<MatchResult[]>([])
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  // History
  const [history, setHistory] = useState<MatchResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [expandedHistoryGroup, setExpandedHistoryGroup] = useState<string | null>(null)

  // Load engineers
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/hiring-spa/engineers?status=complete')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setEngineers((data.profiles || []).map((p: Engineer) => ({ id: p.id, name: p.name, email: p.email })))
      } catch {
        setEngineers([])
      } finally {
        setLoadingEngineers(false)
      }
    }
    load()
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/admin/hiring-spa/adhoc-match/history')
      if (!res.ok) throw new Error()
      setHistory((await res.json()).matches || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Extract JD
  async function handleExtract() {
    setExtracting(true)
    setExtractError(null)
    setExtractedJD(null)
    try {
      const res = await fetch('/api/admin/hiring-spa/adhoc-match/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      setExtractedJD(data)
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  // Score
  async function handleScore() {
    setScoring(true)
    setScoreError(null)
    setResults([])
    try {
      const res = await fetch('/api/admin/hiring-spa/adhoc-match/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_url: jdUrl,
          engineer_ids: Array.from(selectedIds),
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scoring failed')
      setResults(data.matches || [])
      loadHistory()
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : 'Scoring failed')
    } finally {
      setScoring(false)
    }
  }

  function toggleEngineer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(engineers.map((e) => e.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function engineerName(match: MatchResult): string {
    if (match.engineer?.name) return match.engineer.name
    const eng = engineers.find((e) => e.id === match.engineer_id)
    return eng?.name || match.engineer_id
  }

  // Group history by jd_url
  const historyGroups = history.reduce<Record<string, { title: string; url: string; matches: MatchResult[] }>>((acc, m) => {
    if (!acc[m.jd_url]) acc[m.jd_url] = { title: m.jd_title, url: m.jd_url, matches: [] }
    acc[m.jd_url].matches.push(m)
    return acc
  }, {})

  const canScore = extractedJD && selectedIds.size > 0 && !scoring

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48, WebkitFontSmoothing: 'antialiased' }}>
      {/* Back link */}
      <Link
        href="/admin/hiring-spa"
        style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.06em', color: c.mist, textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        &larr; Pipeline
      </Link>

      <p style={label}>Admin</p>
      <h1 style={{ ...heading, marginBottom: 8 }}>Ad-Hoc JD Match</h1>
      <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: '0 0 40px 0' }}>
        Paste a JD URL, pick engineers, and see full 5-dimension scores
      </p>

      {/* ── 1. URL Input ──────────────────────────────────── */}
      <div style={{ ...card, padding: 24, marginBottom: 24 }}>
        <div style={cardTitle}>Job Description URL</div>
        <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="url"
            placeholder="https://boards.greenhouse.io/..."
            value={jdUrl}
            onChange={(e) => setJdUrl(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleExtract}
            disabled={!jdUrl || extracting}
            style={!jdUrl || extracting ? btnDisabled : btnPrimary}
          >
            {extracting ? 'Extracting...' : 'Extract'}
          </button>
        </div>
        {extractError && (
          <p style={{ fontFamily: f.mono, fontSize: 11, color: '#b44', padding: '0 24px 16px' }}>{extractError}</p>
        )}
        {extractedJD && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={badge(c.honeyLight, c.match)}>{extractedJD.source_platform}</span>
              <span style={{ fontFamily: f.serif, fontSize: 16, color: c.charcoal }}>{extractedJD.title}</span>
            </div>
            <button
              onClick={() => setShowRawText(!showRawText)}
              style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.06em', color: c.mist, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 0 }}
            >
              {showRawText ? 'Hide' : 'Show'} raw text
            </button>
            {showRawText && (
              <pre style={{ fontFamily: f.mono, fontSize: 11, color: c.graphite, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', marginTop: 8, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: `1px solid ${c.stoneLight}` }}>
                {extractedJD.raw_text}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Engineer Selection ─────────────────────────── */}
      <div style={{ ...card, padding: 24, marginBottom: 24 }}>
        <div style={{ ...cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Select Engineers ({selectedIds.size} selected)</span>
          <span style={{ display: 'flex', gap: 12 }}>
            <button onClick={selectAll} style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.06em', color: c.match, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Select All</button>
            <button onClick={clearSelection} style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: '0.06em', color: c.mist, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Clear</button>
          </span>
        </div>
        <div style={{ padding: '12px 24px', maxHeight: 280, overflow: 'auto' }}>
          {loadingEngineers ? (
            <p style={{ fontFamily: f.serif, fontSize: 14, color: c.mist }}>Loading engineers...</p>
          ) : engineers.length === 0 ? (
            <p style={{ fontFamily: f.serif, fontSize: 14, color: c.mist }}>No completed engineers found</p>
          ) : (
            engineers.map((eng) => (
              <label
                key={eng.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', borderBottom: `1px solid ${c.stoneLight}` }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(eng.id)}
                  onChange={() => toggleEngineer(eng.id)}
                  style={{ accentColor: c.match }}
                />
                <span style={{ fontFamily: f.serif, fontSize: 14, color: c.charcoal }}>{eng.name}</span>
                <span style={{ fontFamily: f.mono, fontSize: 11, color: c.mist }}>{eng.email}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* ── 3. Notes + Score Button ───────────────────────── */}
      <div style={{ ...card, padding: 24, marginBottom: 40 }}>
        <div style={cardTitle}>Score</div>
        <div style={{ padding: '16px 24px' }}>
          <textarea
            placeholder="Optional notes (e.g., source, context)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
          />
          <button
            onClick={handleScore}
            disabled={!canScore}
            style={canScore ? btnPrimary : btnDisabled}
          >
            {scoring ? `Scoring ${selectedIds.size} engineer${selectedIds.size > 1 ? 's' : ''}...` : `Score ${selectedIds.size} engineer${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
          {scoreError && (
            <p style={{ fontFamily: f.mono, fontSize: 11, color: '#b44', marginTop: 8 }}>{scoreError}</p>
          )}
        </div>
      </div>

      {/* ── 4. Results Table ──────────────────────────────── */}
      {results.length > 0 && (
        <div style={{ ...card, marginBottom: 40 }}>
          <div style={cardTitle}>Results — {extractedJD?.title}</div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 12, padding: 24, flexWrap: 'wrap' }}>
            <div style={{ ...card, padding: '16px 20px', flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
              <div style={statValue}>{results.length}</div>
              <div style={statLabel}>Engineers Scored</div>
            </div>
            <div style={{ ...card, padding: '16px 20px', flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
              <div style={statValue}>{Math.max(...results.map((r) => r.overall_score))}</div>
              <div style={statLabel}>Top Score</div>
            </div>
            <div style={{ ...card, padding: '16px 20px', flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
              <div style={statValue}>{Math.round(results.reduce((s, r) => s + r.overall_score, 0) / results.length)}</div>
              <div style={statLabel}>Avg Score</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Engineer</th>
                  <th style={{ ...th, textAlign: 'center' }}>Overall</th>
                  {DIMENSION_LABELS.map((d) => (
                    <th key={d.key} style={{ ...th, textAlign: 'center' }}>{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...results].sort((a, b) => b.overall_score - a.overall_score).map((match) => (
                  <Fragment key={match.id}>
                    <tr
                      onClick={() => setExpandedResult(expandedResult === match.id ? null : match.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={td}>{engineerName(match)}</td>
                      <td style={{ ...tdMono, textAlign: 'center', fontWeight: 600, color: scoreColor(match.overall_score) }}>
                        {match.overall_score}
                      </td>
                      {DIMENSION_LABELS.map((d) => (
                        <td key={d.key} style={{ ...tdMono, textAlign: 'center', color: scoreColor(match.dimension_scores[d.key]) }}>
                          {match.dimension_scores[d.key]}
                        </td>
                      ))}
                    </tr>
                    {expandedResult === match.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: '#fff', borderBottom: `1px solid ${c.stoneLight}` }}>
                          {match.highlight_quote && (
                            <p style={{ fontFamily: f.serif, fontSize: 14, fontStyle: 'italic', color: c.match, margin: '0 0 12px' }}>
                              &ldquo;{match.highlight_quote}&rdquo;
                            </p>
                          )}
                          {DIMENSION_LABELS.map((d) => (
                            <div key={d.key} style={{ marginBottom: 8 }}>
                              <span style={badge(c.stoneLight, c.graphite)}>{d.label}</span>
                              <span style={{ fontFamily: f.serif, fontSize: 13, color: c.graphite, marginLeft: 8 }}>
                                {match.reasoning[d.key]}
                              </span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. History ────────────────────────────────────── */}
      <div style={card}>
        <div style={cardTitle}>History</div>
        {loadingHistory ? (
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.mist, padding: 24 }}>Loading...</p>
        ) : Object.keys(historyGroups).length === 0 ? (
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.mist, padding: 24 }}>No past matches</p>
        ) : (
          Object.entries(historyGroups).map(([url, group]) => (
            <div key={url} style={{ borderBottom: `1px solid ${c.stoneLight}` }}>
              <div
                onClick={() => setExpandedHistoryGroup(expandedHistoryGroup === url ? null : url)}
                style={{ padding: '14px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <span style={{ fontFamily: f.serif, fontSize: 14, color: c.charcoal }}>{group.title}</span>
                  <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist, marginLeft: 12 }}>
                    {group.matches.length} engineer{group.matches.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist }}>
                  {new Date(group.matches[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {expandedHistoryGroup === url && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Engineer</th>
                        <th style={{ ...th, textAlign: 'center' }}>Overall</th>
                        {DIMENSION_LABELS.map((d) => (
                          <th key={d.key} style={{ ...th, textAlign: 'center' }}>{d.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...group.matches].sort((a, b) => b.overall_score - a.overall_score).map((match) => (
                        <Fragment key={match.id}>
                          <tr
                            onClick={() => setExpandedHistory(expandedHistory === match.id ? null : match.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={td}>{engineerName(match)}</td>
                            <td style={{ ...tdMono, textAlign: 'center', fontWeight: 600, color: scoreColor(match.overall_score) }}>
                              {match.overall_score}
                            </td>
                            {DIMENSION_LABELS.map((d) => (
                              <td key={d.key} style={{ ...tdMono, textAlign: 'center', color: scoreColor(match.dimension_scores[d.key]) }}>
                                {match.dimension_scores[d.key]}
                              </td>
                            ))}
                          </tr>
                          {expandedHistory === match.id && (
                            <tr>
                              <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: '#fff', borderBottom: `1px solid ${c.stoneLight}` }}>
                                {match.highlight_quote && (
                                  <p style={{ fontFamily: f.serif, fontSize: 14, fontStyle: 'italic', color: c.match, margin: '0 0 12px' }}>
                                    &ldquo;{match.highlight_quote}&rdquo;
                                  </p>
                                )}
                                {DIMENSION_LABELS.map((d) => (
                                  <div key={d.key} style={{ marginBottom: 8 }}>
                                    <span style={badge(c.stoneLight, c.graphite)}>{d.label}</span>
                                    <span style={{ fontFamily: f.serif, fontSize: 13, color: c.graphite, marginLeft: 8 }}>
                                      {match.reasoning[d.key]}
                                    </span>
                                  </div>
                                ))}
                                {match.notes && (
                                  <div style={{ marginTop: 8 }}>
                                    <span style={badge(c.honeyLight, c.match)}>Notes</span>
                                    <span style={{ fontFamily: f.serif, fontSize: 13, color: c.graphite, marginLeft: 8 }}>{match.notes}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
