'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { EngineerJobMatchWithJob, FeedbackCategory, MatchingPreferences } from '@/lib/hiring-spa/types'
import JobMatchCard from './JobMatchCard'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'
import { ease, duration, drift, stagger } from '@/lib/engineer-animation-tokens'

interface Props {
  matches: EngineerJobMatchWithJob[]
  totalMatchCount?: number
}

export default function JobMatchList({ matches: initialMatches, totalMatchCount = 0 }: Props) {
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
    const allReviewed = totalMatchCount > 0
    return (
      <div style={{
        backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
        borderRadius: 8, padding: 40, textAlign: 'center',
      }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
          {allReviewed ? 'All caught up' : 'Matches on the way'}
        </h3>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.mist, margin: 0 }}>
          {allReviewed
            ? 'You\u2019ve reviewed all your current matches. New matches will appear as we find more jobs that fit your profile.'
            : 'We\u2019re scoring jobs against your profile right now. Check back soon \u2014 your top matches will appear here.'}
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger.items, delayChildren: stagger.initialDelay } },
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <AnimatePresence>
        {matches.map(match => (
          <motion.div
            key={match.id}
            layout
            variants={{
              hidden: { opacity: 0, y: drift.item },
              visible: { opacity: 1, y: 0, transition: { duration: duration.page, ease: ease.page } },
            }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.25 } }}
          >
            <JobMatchCard
              match={match}
              onFeedback={handleFeedback}
              onAddPreference={handleAddPreference}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
