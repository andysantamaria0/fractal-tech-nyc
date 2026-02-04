'use client'

import { useState, useCallback } from 'react'
import type { EngineerJobMatchWithJob, FeedbackCategory, MatchingPreferences } from '@/lib/hiring-spa/types'
import JobMatchCard from './JobMatchCard'

const c = {
  charcoal: '#2C2C2C', mist: '#9C9C9C',
  fog: '#F7F5F2',
  stoneLight: 'rgba(166, 155, 141, 0.12)',
}
const f = {
  serif: 'Georgia, "Times New Roman", serif',
}

interface Props {
  matches: EngineerJobMatchWithJob[]
}

export default function JobMatchList({ matches: initialMatches }: Props) {
  const [matches, setMatches] = useState(initialMatches)

  const handleFeedback = useCallback(async (
    matchId: string,
    feedback: 'not_a_fit' | 'applied',
    reason?: string,
    category?: FeedbackCategory,
  ) => {
    const res = await fetch(`/api/engineer/matches/${matchId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, reason, category }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to record feedback')
    }

    if (feedback === 'not_a_fit') {
      setMatches(prev => prev.filter(m => m.id !== matchId))
    } else {
      setMatches(prev => prev.map(m =>
        m.id === matchId
          ? { ...m, feedback: 'applied', applied_at: new Date().toISOString() }
          : m
      ))
    }
  }, [])

  const handleAddPreference = useCallback(async (
    type: keyof MatchingPreferences,
    value: string,
  ) => {
    const res = await fetch('/api/engineer/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value }),
    })

    if (!res.ok) {
      const data = await res.json()
      console.error('Failed to save preference:', data.error)
    }
  }, [])

  if (matches.length === 0) {
    return (
      <div style={{
        backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
        borderRadius: 8, padding: 40, textAlign: 'center',
      }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
          No matches to show
        </h3>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist, margin: 0 }}>
          All matches have been reviewed, or matches haven&apos;t been computed yet.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {matches.map(match => (
        <JobMatchCard
          key={match.id}
          match={match}
          onFeedback={handleFeedback}
          onAddPreference={handleAddPreference}
        />
      ))}
    </div>
  )
}
