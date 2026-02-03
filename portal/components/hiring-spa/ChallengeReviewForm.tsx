'use client'

import { useState, useCallback } from 'react'

interface Props {
  submissionId: string
  onReviewed: (review: {
    human_score: number
    human_feedback: string
    reviewer_name: string
    reviewer_linkedin_url: string | null
    final_score: number
  }) => void
}

export default function ChallengeReviewForm({ submissionId, onReviewed }: Props) {
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerLinkedin, setReviewerLinkedin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const numScore = parseInt(score, 10)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setError('Score must be between 0 and 100')
      return
    }
    if (!feedback.trim()) {
      setError('Feedback is required')
      return
    }
    if (!reviewerName.trim()) {
      setError('Reviewer name is required')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/hiring-spa/challenges/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_score: numScore,
          human_feedback: feedback.trim(),
          reviewer_name: reviewerName.trim(),
          reviewer_linkedin_url: reviewerLinkedin.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit review')
        return
      }

      onReviewed({
        human_score: numScore,
        human_feedback: feedback.trim(),
        reviewer_name: reviewerName.trim(),
        reviewer_linkedin_url: reviewerLinkedin.trim() || null,
        final_score: data.final_score,
      })
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }, [submissionId, score, feedback, reviewerName, reviewerLinkedin, onReviewed])

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <p className="spa-label" style={{ marginBottom: 12 }}>Engineering Leader Review</p>

      <div className="spa-form-field">
        <label className="spa-form-label">Score (0-100)</label>
        <input
          className="spa-input"
          type="number"
          min={0}
          max={100}
          placeholder="0-100"
          value={score}
          onChange={e => setScore(e.target.value)}
          style={{ maxWidth: 120 }}
        />
      </div>

      <div className="spa-form-field">
        <label className="spa-form-label">Feedback</label>
        <textarea
          className="spa-textarea"
          placeholder="Provide feedback on the submission..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
        />
      </div>

      <div className="spa-form-field">
        <label className="spa-form-label">Reviewer Name</label>
        <input
          className="spa-input"
          type="text"
          placeholder="Jane Smith"
          value={reviewerName}
          onChange={e => setReviewerName(e.target.value)}
        />
      </div>

      <div className="spa-form-field">
        <label className="spa-form-label">Reviewer LinkedIn URL</label>
        <input
          className="spa-input"
          type="url"
          placeholder="https://linkedin.com/in/..."
          value={reviewerLinkedin}
          onChange={e => setReviewerLinkedin(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: '#c0392b', fontFamily: 'var(--spa-font-mono)', fontSize: 11, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button
        className="spa-btn spa-btn-primary"
        type="submit"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
