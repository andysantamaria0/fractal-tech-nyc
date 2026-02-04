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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div>
            <span className="engineer-match-title">{job.job_title}</span>
            <span className="engineer-match-company">{job.company_name}</span>
          </div>
          {job.location && (
            <span className="engineer-match-location">{job.location}</span>
          )}
        </div>
        <div className="engineer-match-score-badge">
          {match.overall_score}%
        </div>
      </button>

      {expanded && (
        <div className="engineer-match-card-detail">
          {match.highlight_quote && (
            <div className="engineer-match-highlight">
              {match.highlight_quote}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <p className="engineer-label" style={{ marginBottom: 12 }}>Dimension Breakdown</p>
            {DIMENSION_ORDER.map(key => {
              const score = (match.dimension_scores as DimensionWeights)[key]
              const matchReasoning = (match.reasoning as MatchReasoning)[key]
              return (
                <div key={key} className="engineer-dimension-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="engineer-dim-label">{DIMENSION_LABELS[key]}</span>
                    <span className="engineer-dim-score">{score}</span>
                  </div>
                  <div className="engineer-dim-bar">
                    <div
                      className="engineer-dim-bar-fill"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  {matchReasoning && (
                    <p className="engineer-dim-reason">{matchReasoning}</p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="engineer-match-link">
            <a href={job.job_url} target="_blank" rel="noopener noreferrer">
              View Job Posting
            </a>
            {job.job_board_source && (
              <span className="engineer-match-source">via {job.job_board_source}</span>
            )}
          </div>

          {showReasonInput && (
            <div className="engineer-reason-input" style={{ marginTop: 12 }}>
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
            <button
              className="btn-primary"
              onClick={handleApplied}
              disabled={acting}
            >
              {acting ? 'Saving...' : 'I Applied'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleNotAFit}
              disabled={acting}
            >
              {showReasonInput ? 'Confirm Not a Fit' : 'Not a Fit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
