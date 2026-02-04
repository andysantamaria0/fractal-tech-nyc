'use client'

import { useState, useCallback } from 'react'
import type { EngineerJobMatchWithJob, FeedbackCategory, MatchingPreferences } from '@/lib/hiring-spa/types'
import JobMatchCard from './JobMatchCard'

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
      // Remove from list
      setMatches(prev => prev.filter(m => m.id !== matchId))
    } else {
      // Update in list
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
      <div className="engineer-empty-state">
        <h3>No matches to show</h3>
        <p>All matches have been reviewed, or matches haven&apos;t been computed yet.</p>
      </div>
    )
  }

  return (
    <div className="engineer-matches-list">
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
