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
    <div className={`engineer-match-card ${expanded ? 'engineer-match-card-expanded' : ''}`}>
      <button
        className="engineer-match-card-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="engineer-match-card-info">
          <h3>{job.job_title}</h3>
          <div className="engineer-match-card-company">{job.company_name}</div>
          {job.location && (
            <div className="engineer-match-card-location">{job.location}</div>
          )}
        </div>
        <div className="engineer-match-score">
          {match.overall_score}%
        </div>
      </button>

      {expanded && (
        <div className="engineer-match-card-body">
          {match.highlight_quote && (
            <div className="engineer-match-highlight">
              {match.highlight_quote}
            </div>
          )}

          <div className="engineer-dimensions">
            {DIMENSION_ORDER.map(key => {
              const score = (match.dimension_scores as DimensionWeights)[key]
              const matchReasoning = (match.reasoning as MatchReasoning)[key]
              return (
                <div key={key} className="engineer-dimension">
                  <div className="engineer-dimension-label">
                    <span>{DIMENSION_LABELS[key]}</span>
                    <span className="engineer-dimension-score">{score}</span>
                  </div>
                  <div className="engineer-dimension-bar">
                    <div
                      className="engineer-dimension-fill"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  {matchReasoning && (
                    <div className="engineer-dimension-reasoning">{matchReasoning}</div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="engineer-match-job-link">
              View Job Posting
            </a>
            {job.job_board_source && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', marginLeft: 8 }}>via {job.job_board_source}</span>
            )}
          </div>

          {feedbackStep === 'picking_category' && (
            <div className="engineer-feedback-categories">
              <div className="engineer-feedback-categories-label">Why isn&apos;t this a fit?</div>
              <div className="engineer-feedback-categories-row">
                {FEEDBACK_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    className="engineer-feedback-category-btn"
                    onClick={() => handleCategorySelect(cat.value)}
                    type="button"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button
                className="engineer-feedback-cancel"
                onClick={handleCancelFeedback}
                type="button"
              >
                Cancel
              </button>
            </div>
          )}

          {feedbackStep === 'confirming' && (
            <div className="engineer-feedback-confirm">
              <div className="engineer-feedback-selected-category">
                {FEEDBACK_CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </div>

              {ruleSuggestion && (
                <label className="engineer-rule-suggestion">
                  <input
                    type="checkbox"
                    checked={addRule}
                    onChange={e => setAddRule(e.target.checked)}
                  />
                  <span>{ruleSuggestion.label}</span>
                </label>
              )}

              <div className="engineer-not-a-fit-reason">
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Additional details (optional)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="engineer-match-actions">
            {applied ? (
              <span className="btn-applied">
                &#10003; Applied
              </span>
            ) : (
              <button
                className="btn-primary"
                onClick={handleApplied}
                disabled={acting}
              >
                {acting ? 'Saving...' : 'I Applied'}
              </button>
            )}
            {!applied && feedbackStep === 'idle' && (
              <button
                className="btn-secondary"
                onClick={handleNotAFit}
                disabled={acting}
              >
                Not a Fit
              </button>
            )}
            {!applied && feedbackStep === 'confirming' && (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleConfirm}
                  disabled={acting}
                >
                  {acting ? 'Saving...' : 'Confirm Not a Fit'}
                </button>
                <button
                  className="engineer-feedback-cancel"
                  onClick={handleCancelFeedback}
                  type="button"
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
