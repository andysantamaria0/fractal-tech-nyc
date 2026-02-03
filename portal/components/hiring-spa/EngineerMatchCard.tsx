'use client'

import { useState, useCallback } from 'react'
import type { MatchWithEngineer, MatchDecision, MatchFeedback, ChallengeSubmission, DimensionWeights, MatchReasoning } from '@/lib/hiring-spa/types'
import MatchFeedbackForm from './MatchFeedbackForm'
import ChallengeReviewForm from './ChallengeReviewForm'

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
  const [challengeSubmission, setChallengeSubmission] = useState<ChallengeSubmission | undefined>(match.challenge_submission)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)

  const engineer = match.engineer
  const topSkills = engineer.engineer_dna?.topSkills?.slice(0, 3) || []
  const hasDecision = match.decision !== null

  // Derive challenge badge
  let challengeBadge: { label: string; className: string } | null = null
  if (match.challenge_response === 'accepted' && !challengeSubmission) {
    challengeBadge = { label: 'Challenge Pending', className: 'spa-badge-challenge-sent' }
  } else if (challengeSubmission && !challengeSubmission.reviewed_at) {
    challengeBadge = {
      label: `Submitted${challengeSubmission.auto_score !== null ? ` · Auto: ${challengeSubmission.auto_score}` : ''}`,
      className: 'spa-badge-challenge-submitted',
    }
  } else if (challengeSubmission?.reviewed_at) {
    challengeBadge = {
      label: `Reviewed · ${challengeSubmission.final_score}/100`,
      className: 'spa-badge-challenge-reviewed',
    }
  }

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
          {challengeBadge && (
            <span className={`spa-badge ${challengeBadge.className}`} style={{ marginLeft: 'auto' }}>
              {challengeBadge.label}
            </span>
          )}
          {!challengeBadge && engineer.profile_summary?.bestFitSignals && (
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

          {/* Challenge submission detail */}
          {challengeSubmission && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--spa-parchment, #FAF8F5)', borderRadius: 6, borderLeft: '3px solid var(--spa-honey)' }}>
              <p className="spa-label" style={{ marginBottom: 8 }}>Challenge Submission</p>

              {challengeSubmission.text_response && (
                <p className="spa-body-small" style={{ marginBottom: 8 }}>
                  {challengeSubmission.text_response.length > 200
                    ? challengeSubmission.text_response.slice(0, 200) + '...'
                    : challengeSubmission.text_response}
                </p>
              )}
              {challengeSubmission.link_url && (
                <p className="spa-body-small" style={{ marginBottom: 8 }}>
                  <a
                    href={challengeSubmission.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--spa-honey)', textDecoration: 'none', borderBottom: '1px solid var(--spa-honey-border)' }}
                  >
                    {challengeSubmission.link_url}
                  </a>
                </p>
              )}
              {challengeSubmission.file_name && challengeSubmission.file_url && (
                <p className="spa-body-small" style={{ marginBottom: 8 }}>
                  <a
                    href={challengeSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--spa-honey)', textDecoration: 'none', borderBottom: '1px solid var(--spa-honey-border)' }}
                  >
                    {challengeSubmission.file_name}
                  </a>
                </p>
              )}

              {/* Auto-Grade */}
              {challengeSubmission.auto_score !== null && (
                <div style={{ marginTop: 8, padding: 8, background: 'var(--spa-fog)', borderRadius: 4 }}>
                  <p className="spa-label" style={{ marginBottom: 4 }}>Auto-Grade: {challengeSubmission.auto_score}/100</p>
                  {challengeSubmission.auto_reasoning && (
                    <p className="spa-body-small">{challengeSubmission.auto_reasoning}</p>
                  )}
                </div>
              )}

              {/* Human review */}
              {challengeSubmission.reviewed_at ? (
                <div style={{ marginTop: 8, padding: 8, background: 'var(--spa-fog)', borderRadius: 4 }}>
                  <p className="spa-label" style={{ marginBottom: 4 }}>
                    Engineering Leader Review: {challengeSubmission.human_score}/100
                  </p>
                  {challengeSubmission.human_feedback && (
                    <p className="spa-body-small" style={{ marginBottom: 4 }}>{challengeSubmission.human_feedback}</p>
                  )}
                  {challengeSubmission.reviewer_name && (
                    <p className="spa-body-small">
                      Reviewed by{' '}
                      {challengeSubmission.reviewer_linkedin_url ? (
                        <a
                          href={challengeSubmission.reviewer_linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--spa-honey)', textDecoration: 'none', borderBottom: '1px solid var(--spa-honey-border)' }}
                        >
                          {challengeSubmission.reviewer_name}
                        </a>
                      ) : (
                        challengeSubmission.reviewer_name
                      )}
                    </p>
                  )}
                  {challengeSubmission.final_score !== null && (
                    <p className="spa-label" style={{ marginTop: 4 }}>
                      Final Score: {challengeSubmission.final_score}/100
                    </p>
                  )}
                </div>
              ) : (
                <ChallengeReviewForm
                  submissionId={challengeSubmission.id}
                  onReviewed={(review) => {
                    setChallengeSubmission({
                      ...challengeSubmission,
                      human_score: review.human_score,
                      human_feedback: review.human_feedback,
                      reviewer_name: review.reviewer_name,
                      reviewer_linkedin_url: review.reviewer_linkedin_url,
                      reviewed_at: new Date().toISOString(),
                      final_score: review.final_score,
                    })
                  }}
                />
              )}
            </div>
          )}

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
