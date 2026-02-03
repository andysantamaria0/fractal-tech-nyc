'use client'

import { useState, useCallback } from 'react'
import type { BeautifiedJD, DimensionWeights } from '@/lib/hiring-spa/types'

export interface MatchData {
  id: string
  overall_score: number
  dimension_scores: DimensionWeights
  highlight_quote: string | null
  challenge_response: string | null
}

export interface ChallengeData {
  enabled: boolean
  prompt: string | null
}

interface Props {
  slug: string
  title: string
  companyName: string
  onUnlock: (jd: BeautifiedJD, title: string, match: MatchData | null, challenge: ChallengeData | null, email: string) => void
}

export default function EmailGate({ slug, title, companyName, onUnlock }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/jd/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      onUnlock(data.beautified_jd, data.title, data.match || null, data.challenge || null, email)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [slug, email, onUnlock])

  return (
    <div className="spa-email-gate">
      <div className="spa-email-gate-card">
        <p className="spa-email-gate-title">{title}</p>
        <p className="spa-email-gate-subtitle">
          {companyName ? `${companyName} · ` : ''}Enter your email to view the full job description
        </p>
        <form className="spa-email-gate-form" onSubmit={handleSubmit}>
          <input
            className="spa-email-gate-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <p className="spa-email-gate-error">{error}</p>}
          <button
            className="spa-btn spa-btn-primary"
            type="submit"
            disabled={loading || !email}
            style={{ width: '100%' }}
          >
            {loading ? 'Loading...' : 'View Job Description'}
          </button>
        </form>
      </div>
    </div>
  )
}
