'use client'

import { useState, useCallback, useMemo } from 'react'
import type {
  EngineerJobMatchWithJob,
  DimensionWeights,
  MatchReasoning,
  FeedbackCategory,
  MatchingPreferences,
} from '@/lib/hiring-spa/types'
import { FEEDBACK_CATEGORIES } from '@/lib/hiring-spa/types'

const c = {
  charcoal: '#2C2C2C', graphite: '#5C5C5C', mist: '#9C9C9C',
  honey: '#C9A86C', match: '#8B7355', stone: '#A69B8D',
  parchment: '#FAF8F5', fog: '#F7F5F2',
  stoneLight: 'rgba(166, 155, 141, 0.12)',
  honeyBorder: 'rgba(201, 168, 108, 0.30)',
  honeyLight: 'rgba(201, 168, 108, 0.20)',
}
const f = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", Monaco, Inconsolata, "Fira Code", monospace',
}

const DIMENSION_LABELS: Record<keyof DimensionWeights, string> = {
  mission: 'Mission',
  technical: 'Technical',
  culture: 'Culture',
  environment: 'Environment',
  dna: 'DNA',
}

const DIMENSION_ORDER: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

interface RuleSuggestion {
  type: keyof MatchingPreferences
  value: string
  label: string
}

interface Props {
  match: EngineerJobMatchWithJob
  onFeedback: (matchId: string, feedback: 'not_a_fit' | 'applied', reason?: string, category?: FeedbackCategory) => Promise<void>
  onAddPreference?: (type: keyof MatchingPreferences, value: string) => Promise<void>
}

export default function JobMatchCard({ match, onFeedback, onAddPreference }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [feedbackStep, setFeedbackStep] = useState<'idle' | 'picking_category' | 'confirming'>('idle')
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [reason, setReason] = useState('')
  const [addRule, setAddRule] = useState(true)
  const [acting, setActing] = useState(false)
  const [applied, setApplied] = useState(!!match.applied_at)
  const [reasonFocused, setReasonFocused] = useState(false)

  const job = match.scanned_job

  const ruleSuggestion = useMemo((): RuleSuggestion | null => {
    if (!selectedCategory) return null
    if (selectedCategory === 'wrong_location' && job.location) {
      return {
        type: 'excluded_locations',
        value: job.location,
        label: `Don't show me jobs in ${job.location}`,
      }
    }
    if (selectedCategory === 'company_not_interesting') {
      return {
        type: 'excluded_companies',
        value: job.company_name,
        label: `Don't show me jobs from ${job.company_name}`,
      }
    }
    return null
  }, [selectedCategory, job.location, job.company_name])

  const handleNotAFit = useCallback(() => {
    setFeedbackStep('picking_category')
  }, [])

  const handleCategorySelect = useCallback((cat: FeedbackCategory) => {
    setSelectedCategory(cat)
    setFeedbackStep('confirming')
    setAddRule(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedCategory) return
    setActing(true)
    try {
      await onFeedback(match.id, 'not_a_fit', reason || undefined, selectedCategory)
      if (addRule && ruleSuggestion && onAddPreference) {
        await onAddPreference(ruleSuggestion.type, ruleSuggestion.value)
      }
    } finally {
      setActing(false)
    }
  }, [match.id, onFeedback, onAddPreference, reason, selectedCategory, addRule, ruleSuggestion])

  const handleApplied = useCallback(async () => {
    setActing(true)
    try {
      await onFeedback(match.id, 'applied')
      setApplied(true)
    } finally {
      setActing(false)
    }
  }, [match.id, onFeedback])

  const handleCancelFeedback = useCallback(() => {
    setFeedbackStep('idle')
    setSelectedCategory(null)
    setReason('')
    setAddRule(true)
  }, [])

  return (
    <div style={{
      backgroundColor: c.fog, border: `1px solid ${expanded ? c.honeyBorder : c.stoneLight}`,
      borderRadius: 8, overflow: 'hidden', transition: 'border-color 200ms ease',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        type="button"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '20px 24px', border: 'none', backgroundColor: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div>
          <h3 style={{ fontFamily: f.serif, fontSize: 17, fontWeight: 400, color: c.charcoal, margin: '0 0 2px 0' }}>
            {job.job_title}
          </h3>
          <div style={{ fontFamily: f.mono, fontSize: 11, color: c.graphite, letterSpacing: '0.03em' }}>
            {job.company_name}
          </div>
          {job.location && (
            <div style={{ fontFamily: f.mono, fontSize: 10, color: c.mist, marginTop: 2 }}>
              {job.location}
            </div>
          )}
        </div>
        <div style={{
          fontFamily: f.mono, fontSize: 22, fontWeight: 500, color: c.match,
          minWidth: 60, textAlign: 'right',
        }}>
          {match.overall_score}%
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 24px 24px' }}>
          {match.highlight_quote && (
            <div style={{
              fontFamily: f.serif, fontSize: 14, fontStyle: 'italic', color: c.graphite,
              borderLeft: `3px solid ${c.honey}`, paddingLeft: 16, marginBottom: 24, lineHeight: 1.6,
            }}>
              {match.highlight_quote}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            {DIMENSION_ORDER.map(key => {
              const score = (match.dimension_scores as DimensionWeights)[key]
              const matchReasoning = (match.reasoning as MatchReasoning)[key]
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.charcoal }}>
                      {DIMENSION_LABELS[key]}
                    </span>
                    <span style={{ fontFamily: f.mono, fontSize: 11, color: c.match }}>
                      {score}
                    </span>
                  </div>
                  <div style={{
                    height: 4, backgroundColor: c.stoneLight, borderRadius: 2, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${score}%`, backgroundColor: c.honey,
                      borderRadius: 2, transition: 'width 300ms ease',
                    }} />
                  </div>
                  {matchReasoning && (
                    <div style={{ fontFamily: f.serif, fontSize: 13, color: c.mist, marginTop: 4, lineHeight: 1.5 }}>
                      {matchReasoning}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 24 }}>
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em',
                color: c.honey, textDecoration: 'none',
                borderBottom: `1px solid ${c.honeyBorder}`,
                paddingBottom: 1,
              }}
            >
              View Job Posting
            </a>
            {job.job_board_source && (
              <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist, marginLeft: 8 }}>
                via {job.job_board_source}
              </span>
            )}
          </div>

          {feedbackStep === 'picking_category' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal, marginBottom: 10 }}>
                Why isn&apos;t this a fit?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {FEEDBACK_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    type="button"
                    style={{
                      fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em',
                      color: c.graphite, backgroundColor: c.parchment,
                      border: `1px solid ${c.stoneLight}`, borderRadius: 4,
                      padding: '8px 14px', cursor: 'pointer',
                      transition: '150ms ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCancelFeedback}
                type="button"
                style={{
                  fontFamily: f.mono, fontSize: 10, color: c.mist,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, textDecoration: 'underline',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {feedbackStep === 'confirming' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em', color: c.honey,
                backgroundColor: c.honeyLight, display: 'inline-block',
                borderRadius: 4, padding: '4px 10px', marginBottom: 12,
              }}>
                {FEEDBACK_CATEGORIES.find(cat => cat.value === selectedCategory)?.label}
              </div>

              {ruleSuggestion && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addRule}
                    onChange={e => setAddRule(e.target.checked)}
                    style={{ accentColor: c.honey }}
                  />
                  <span style={{ fontFamily: f.serif, fontSize: 13, color: c.graphite }}>
                    {ruleSuggestion.label}
                  </span>
                </label>
              )}

              <textarea
                rows={2}
                placeholder="Additional details (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                onFocus={() => setReasonFocused(true)}
                onBlur={() => setReasonFocused(false)}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  fontFamily: f.serif, fontSize: 14, color: c.charcoal,
                  backgroundColor: c.parchment,
                  border: `1px solid ${reasonFocused ? c.honey : c.stoneLight}`,
                  borderRadius: 6, padding: '10px 14px', outline: 'none',
                  resize: 'vertical' as const, lineHeight: 1.5,
                  transition: 'border-color 200ms ease',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {applied ? (
              <span style={{
                fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em',
                color: c.match, backgroundColor: c.honeyLight,
                borderRadius: 4, padding: '10px 20px',
              }}>
                &#10003; Applied
              </span>
            ) : (
              <button
                onClick={handleApplied}
                disabled={acting}
                style={{
                  fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  backgroundColor: acting ? c.mist : c.charcoal, color: c.parchment,
                  border: 'none', borderRadius: 4, padding: '12px 24px',
                  cursor: acting ? 'not-allowed' : 'pointer', transition: '150ms ease',
                }}
              >
                {acting ? 'Saving...' : 'I Applied'}
              </button>
            )}
            {!applied && feedbackStep === 'idle' && (
              <button
                onClick={handleNotAFit}
                disabled={acting}
                style={{
                  fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  backgroundColor: 'transparent', color: c.graphite,
                  border: `1px solid ${c.stone}`, borderRadius: 4, padding: '11px 24px',
                  cursor: acting ? 'not-allowed' : 'pointer', transition: '150ms ease',
                }}
              >
                Not a Fit
              </button>
            )}
            {!applied && feedbackStep === 'confirming' && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={acting}
                  style={{
                    fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                    backgroundColor: 'transparent', color: c.graphite,
                    border: `1px solid ${c.stone}`, borderRadius: 4, padding: '11px 24px',
                    cursor: acting ? 'not-allowed' : 'pointer', transition: '150ms ease',
                  }}
                >
                  {acting ? 'Saving...' : 'Confirm Not a Fit'}
                </button>
                <button
                  onClick={handleCancelFeedback}
                  type="button"
                  style={{
                    fontFamily: f.mono, fontSize: 10, color: c.mist,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, textDecoration: 'underline',
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
