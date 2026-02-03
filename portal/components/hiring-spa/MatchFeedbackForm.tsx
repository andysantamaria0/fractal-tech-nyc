'use client'

import { useState, useCallback } from 'react'
import type { MatchFeedback } from '@/lib/hiring-spa/types'

interface Props {
  matchId: string
  onSubmit: (feedback: MatchFeedback) => void
}

export default function MatchFeedbackForm({ matchId, onSubmit }: Props) {
  const [hired, setHired] = useState<boolean | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [workedWell, setWorkedWell] = useState('')
  const [didntWork, setDidntWork] = useState('')
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async () => {
    if (hired === null) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/hiring-spa/matches/${matchId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hired,
          rating: rating ?? undefined,
          worked_well: workedWell || undefined,
          didnt_work: didntWork || undefined,
          would_use_again: wouldUseAgain ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit feedback')
        return
      }
      onSubmit(data.feedback)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }, [matchId, hired, rating, workedWell, didntWork, wouldUseAgain, onSubmit])

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--spa-fog, #F7F5F2)', borderRadius: 6 }}>
      <p className="spa-label" style={{ marginBottom: 12 }}>Match Feedback</p>

      {/* Hired toggle */}
      <div style={{ marginBottom: 12 }}>
        <p className="spa-body-small" style={{ marginBottom: 8 }}>Did you hire this person?</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`spa-btn ${hired === true ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
            onClick={() => setHired(true)}
            style={{ padding: '4px 16px', fontSize: 12 }}
          >
            Yes
          </button>
          <button
            className={`spa-btn ${hired === false ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
            onClick={() => setHired(false)}
            style={{ padding: '4px 16px', fontSize: 12 }}
          >
            No
          </button>
        </div>
      </div>

      {hired === true && (
        <>
          {/* Rating */}
          <div style={{ marginBottom: 12 }}>
            <p className="spa-body-small" style={{ marginBottom: 8 }}>Rating (1-5)</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`spa-btn ${rating === n ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
                  onClick={() => setRating(n)}
                  style={{ padding: '4px 10px', fontSize: 12, minWidth: 32 }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* What worked well */}
          <div style={{ marginBottom: 12 }}>
            <p className="spa-body-small" style={{ marginBottom: 4 }}>What worked well?</p>
            <textarea
              className="spa-textarea"
              value={workedWell}
              onChange={e => setWorkedWell(e.target.value)}
              placeholder="Brief notes..."
              style={{ minHeight: 60, fontSize: 13 }}
            />
          </div>

          {/* Would use again */}
          <div style={{ marginBottom: 12 }}>
            <p className="spa-body-small" style={{ marginBottom: 8 }}>Would you use Fractal matching again?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`spa-btn ${wouldUseAgain === true ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
                onClick={() => setWouldUseAgain(true)}
                style={{ padding: '4px 16px', fontSize: 12 }}
              >
                Yes
              </button>
              <button
                className={`spa-btn ${wouldUseAgain === false ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
                onClick={() => setWouldUseAgain(false)}
                style={{ padding: '4px 16px', fontSize: 12 }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      {hired === false && (
        <div style={{ marginBottom: 12 }}>
          <p className="spa-body-small" style={{ marginBottom: 4 }}>What didn't work?</p>
          <textarea
            className="spa-textarea"
            value={didntWork}
            onChange={e => setDidntWork(e.target.value)}
            placeholder="Brief notes..."
            style={{ minHeight: 60, fontSize: 13 }}
          />
        </div>
      )}

      {error && <p className="spa-body-small" style={{ color: '#c0392b', marginBottom: 8 }}>{error}</p>}

      <button
        className="spa-btn spa-btn-primary"
        onClick={handleSubmit}
        disabled={submitting || hired === null}
        style={{ fontSize: 12 }}
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  )
}
