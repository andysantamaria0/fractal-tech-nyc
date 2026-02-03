'use client'

import { useState, useCallback } from 'react'
import type { MatchWithEngineer, MatchDecision, MatchFeedback, DimensionWeights, MatchReasoning } from '@/lib/hiring-spa/types'
import MatchFeedbackForm from './MatchFeedbackForm'

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
  match: MatchWithEngineer
  onDecision: (matchId: string, decision: MatchDecision) => Promise<void>
}

export default function EngineerMatchCard({ match, onDecision }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [feedback, setFeedback] = useState<MatchFeedback | undefined>(match.feedback)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)

  const engineer = match.engineer
  const topSkills = engineer.engineer_dna?.topSkills?.slice(0, 3) || []
  const hasDecision = match.decision !== null

  const handleDecision = useCallback(async (decision: MatchDecision) => {
    setDeciding(true)
    try {
      await onDecision(match.id, decision)
    } finally {
      setDeciding(false)
    }
  }, [match.id, onDecision])

  if (match.decision === 'passed') {
    return (
      <div className="spa-match-card spa-match-passed">
        <div className="spa-match-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="spa-heading-3">{engineer.name}</span>
            <span className="spa-badge spa-badge-default">Passed</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`spa-match-card ${expanded ? 'spa-match-card-expanded' : ''}`}>
      {/* Collapsed header — always visible */}
      <button
        className="spa-match-card-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span className="spa-heading-3">{engineer.name}</span>
          <div className="spa-tag-list" style={{ marginBottom: 0 }}>
            {topSkills.map(skill => (
              <span key={skill} className="spa-tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                {skill}
              </span>
            ))}
          </div>
          {engineer.profile_summary?.bestFitSignals && (
            <span className="spa-badge spa-badge-honey" style={{ marginLeft: 'auto' }}>
              {match.engineer.status === 'complete' ? 'Complete' : match.engineer.status}
            </span>
          )}
        </div>
        <div className="spa-match-score-badge">
          {match.overall_score}%
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="spa-match-card-detail">
          {/* Highlight quote */}
          {match.highlight_quote && (
            <div className="spa-match-highlight">
              {match.highlight_quote}
            </div>
          )}

          {/* Dimension scores */}
          <div style={{ marginTop: 16 }}>
            <p className="spa-label" style={{ marginBottom: 12 }}>Dimension Breakdown</p>
            {DIMENSION_ORDER.map(key => {
              const score = (match.dimension_scores as DimensionWeights)[key]
              const reason = (match.reasoning as MatchReasoning)[key]
              return (
                <div key={key} className="spa-match-dimension-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="spa-body-small" style={{ fontWeight: 400 }}>
                      {DIMENSION_LABELS[key]}
                    </span>
                    <span className="spa-body-small" style={{ fontFamily: 'var(--spa-font-mono)', fontSize: 12 }}>
                      {score}
                    </span>
                  </div>
                  <div className="spa-match-dimension-bar">
                    <div
                      className="spa-match-dimension-bar-fill"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  {reason && (
                    <p className="spa-body-small" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
                      {reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          {!hasDecision && (
            <div className="spa-match-actions">
              <button
                className="spa-btn spa-btn-primary"
                onClick={() => handleDecision('moved_forward')}
                disabled={deciding}
              >
                {deciding ? 'Updating...' : 'Move Forward'}
              </button>
              <button
                className="spa-btn spa-btn-secondary"
                onClick={() => handleDecision('passed')}
                disabled={deciding}
              >
                Pass
              </button>
            </div>
          )}

          {match.decision === 'moved_forward' && (
            <>
              <div className="spa-match-actions">
                <span className="spa-badge spa-badge-success">Moved Forward</span>
                {match.engineer_decision === 'interested' && (
                  <span className="spa-badge spa-badge-success">Engineer Interested</span>
                )}
                {match.engineer_decision === 'not_interested' && (
                  <span className="spa-badge spa-badge-default">Engineer Declined</span>
                )}
                {match.engineer_decision === null && (
                  <span className="spa-badge spa-badge-honey">Awaiting Engineer</span>
                )}
              </div>

              {/* Feedback section */}
              {feedback ? (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--spa-fog, #F7F5F2)', borderRadius: 6 }}>
                  <p className="spa-label" style={{ marginBottom: 8 }}>Feedback</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className={`spa-badge ${feedback.hired ? 'spa-badge-success' : 'spa-badge-default'}`}>
                      {feedback.hired ? 'Hired' : 'Not Hired'}
                    </span>
                    {feedback.rating && (
                      <span className="spa-badge spa-badge-honey">Rating: {feedback.rating}/5</span>
                    )}
                    {feedback.would_use_again !== null && (
                      <span className="spa-badge spa-badge-default">
                        {feedback.would_use_again ? 'Would use again' : 'Would not use again'}
                      </span>
                    )}
                  </div>
                  {feedback.worked_well && (
                    <p className="spa-body-small" style={{ marginBottom: 4 }}>
                      <strong>Worked well:</strong> {feedback.worked_well}
                    </p>
                  )}
                  {feedback.didnt_work && (
                    <p className="spa-body-small">
                      <strong>Didn&apos;t work:</strong> {feedback.didnt_work}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {!showFeedbackForm ? (
                    <button
                      className="spa-btn spa-btn-secondary"
                      onClick={() => setShowFeedbackForm(true)}
                      style={{ marginTop: 12, fontSize: 12 }}
                    >
                      Give Feedback
                    </button>
                  ) : (
                    <MatchFeedbackForm
                      matchId={match.id}
                      onSubmit={(fb) => {
                        setFeedback(fb)
                        setShowFeedbackForm(false)
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
