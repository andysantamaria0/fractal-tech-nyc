'use client'

import { useState, useCallback } from 'react'
import type { EngineerJobMatchWithJob, DimensionWeights, MatchReasoning } from '@/lib/hiring-spa/types'

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

interface Props {
  match: EngineerJobMatchWithJob
  onFeedback: (matchId: string, feedback: 'not_a_fit' | 'applied', reason?: string) => Promise<void>
}

export default function JobMatchCard({ match, onFeedback }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showReasonInput, setShowReasonInput] = useState(false)
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState(false)
  const [applied, setApplied] = useState(!!match.applied_at)

  const job = match.scanned_job

  const handleNotAFit = useCallback(async () => {
    if (!showReasonInput) {
      setShowReasonInput(true)
      return
    }
    setActing(true)
    try {
      await onFeedback(match.id, 'not_a_fit', reason)
    } finally {
      setActing(false)
    }
  }, [match.id, onFeedback, reason, showReasonInput])

  const handleApplied = useCallback(async () => {
    setActing(true)
    try {
      await onFeedback(match.id, 'applied')
      setApplied(true)
    } finally {
      setActing(false)
    }
  }, [match.id, onFeedback])

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

          {showReasonInput && (
            <div className="engineer-not-a-fit-reason">
              <textarea
                className="form-input"
                rows={2}
                placeholder="Why isn't this a fit? (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
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
            {!applied && (
              <button
                className="btn-secondary"
                onClick={handleNotAFit}
                disabled={acting}
              >
                {showReasonInput ? 'Confirm Not a Fit' : 'Not a Fit'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
