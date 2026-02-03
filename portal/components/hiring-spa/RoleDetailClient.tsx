'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DimensionWeightSliders from './DimensionWeightSliders'
import InteractiveJDView from './InteractiveJDView'
import EngineerMatchCard from './EngineerMatchCard'
import type { HiringRole, MatchWithEngineer, MatchDecision, DimensionWeights, DimensionWeightsRaw, RoleStatus, JDFeedback, BeautifiedJD } from '@/lib/hiring-spa/types'

const STATUS_OPTIONS: { value: RoleStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

interface RoleDetailClientProps {
  role: HiringRole
  initialMatches?: MatchWithEngineer[]
}

export default function RoleDetailClient({ role: initialRole, initialMatches = [] }: RoleDetailClientProps) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [matches, setMatches] = useState<MatchWithEngineer[]>(initialMatches)
  const [beautifying, setBeautifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [jdReviewed, setJdReviewed] = useState(
    !!(initialRole.jd_feedback || initialRole.dimension_weights_raw)
  )
  const feedbackDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateRole = useCallback(async (updates: Record<string, unknown>) => {
    setError('')
    const res = await fetch(`/api/hiring-spa/roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to update')
      return null
    }
    setRole(data.role)
    return data.role
  }, [role.id])

  const handleSaveWeights = useCallback(async (normalized: DimensionWeights, raw: DimensionWeightsRaw) => {
    await updateRole({ dimension_weights: normalized, dimension_weights_raw: raw })
    setJdReviewed(true)
  }, [updateRole])

  const handleStatusChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await updateRole({ status: e.target.value })
  }, [updateRole])

  const handleBeautify = useCallback(async () => {
    setError('')
    setBeautifying(true)
    try {
      const res = await fetch('/api/hiring-spa/roles/beautify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: role.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to beautify')
        return
      }
      setRole(data.role)
    } catch {
      setError('Network error')
    } finally {
      setBeautifying(false)
    }
  }, [role.id])

  const handleToggleChallenge = useCallback(async () => {
    await updateRole({ challenge_enabled: !role.challenge_enabled })
  }, [role.challenge_enabled, updateRole])

  const handleChallengePrompt = useCallback(async (prompt: string) => {
    await updateRole({ challenge_prompt: prompt })
  }, [updateRole])

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/jd/${role.public_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [role.public_slug])

  const handleFeedbackChange = useCallback((feedback: JDFeedback) => {
    // Update local state immediately
    setRole(prev => ({ ...prev, jd_feedback: feedback }))

    // Debounced save
    if (feedbackDebounceRef.current) {
      clearTimeout(feedbackDebounceRef.current)
    }
    feedbackDebounceRef.current = setTimeout(async () => {
      await fetch(`/api/hiring-spa/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_feedback: feedback }),
      })
    }, 1200)
  }, [role.id])

  const handleRegenerateWithFeedback = useCallback(async () => {
    if (!role.jd_feedback) return
    setError('')
    setBeautifying(true)
    try {
      const res = await fetch('/api/hiring-spa/roles/beautify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: role.id, feedback: role.jd_feedback }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to re-beautify')
        return
      }
      setRole(data.role)
      setJdReviewed(true)
    } catch {
      setError('Network error')
    } finally {
      setBeautifying(false)
    }
  }, [role.id, role.jd_feedback])

  const handleConfirmJD = useCallback(async () => {
    // Save empty jd_feedback to persist the "reviewed" state
    const emptyFeedback: JDFeedback = {
      requirements: {},
      team_context: { sentiment: null },
      working_vibe: { sentiment: null },
      culture_check: { sentiment: null },
    }
    await updateRole({ jd_feedback: emptyFeedback })
    setJdReviewed(true)
  }, [updateRole])

  const handleMatchDecision = useCallback(async (matchId: string, decision: MatchDecision) => {
    setError('')
    const res = await fetch(`/api/hiring-spa/matches/${matchId}/decision`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to update decision')
      return
    }
    // Update local match state
    setMatches(prev =>
      prev.map(m => m.id === matchId ? { ...m, decision, decision_at: new Date().toISOString() } : m)
    )
  }, [])

  return (
    <div>
      {error && (
        <div className="spa-card" style={{ marginBottom: 24, borderColor: '#c0392b' }}>
          <p className="spa-body-small" style={{ color: '#c0392b' }}>{error}</p>
        </div>
      )}

      {/* Actions bar */}
      <div className="spa-role-detail-actions" style={{ marginBottom: 32 }}>
        <select
          className="spa-select"
          value={role.status}
          onChange={handleStatusChange}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          className="spa-btn spa-btn-secondary"
          onClick={handleBeautify}
          disabled={beautifying || !role.source_content}
        >
          {beautifying ? 'Beautifying...' : role.beautified_jd ? 'Re-Beautify' : 'Beautify'}
        </button>

        {role.status === 'active' && (
          <button className="spa-copy-link" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Copy Public Link'}
          </button>
        )}
      </div>

      {/* Beautified JD — interactive review */}
      {role.beautified_jd && (
        <div className="spa-role-detail-section">
          <div className="spa-section-header">
            <h2 className="spa-heading-2">Beautified Job Description</h2>
          </div>
          <div className="spa-card" style={{ marginBottom: 32 }}>
            <InteractiveJDView
              jd={role.beautified_jd as BeautifiedJD}
              feedback={role.jd_feedback as JDFeedback | null}
              onFeedbackChange={handleFeedbackChange}
              onRegenerate={handleRegenerateWithFeedback}
              onConfirm={handleConfirmJD}
              regenerating={beautifying}
            />
          </div>
        </div>
      )}

      {/* Dimension Weights */}
      <div className="spa-role-detail-section">
        <div className="spa-section-header">
          <h2 className="spa-heading-2">Dimension Weights</h2>
        </div>
        <p className="spa-body-small" style={{ marginBottom: 16 }}>
          Set how much each dimension matters for this role. Drag each slider independently.
        </p>
        <DimensionWeightSliders
          weightsRaw={role.dimension_weights_raw as DimensionWeightsRaw | null}
          onSave={handleSaveWeights}
        />
      </div>

      {/* Challenge */}
      <div className="spa-role-detail-section">
        <div className="spa-section-header">
          <h2 className="spa-heading-2">Challenge Question</h2>
        </div>
        <div className="spa-toggle-row" style={{ marginBottom: 16 }}>
          <button
            className={`spa-toggle ${role.challenge_enabled ? 'spa-toggle-active' : ''}`}
            onClick={handleToggleChallenge}
          >
            <span className="spa-toggle-knob" />
          </button>
          <span className="spa-body-small">
            {role.challenge_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {role.challenge_enabled && (
          <div className="spa-form-field">
            <label className="spa-form-label">Challenge Prompt</label>
            <textarea
              className="spa-textarea"
              placeholder="Describe a short challenge or take-home prompt for candidates..."
              value={role.challenge_prompt || ''}
              onChange={e => handleChallengePrompt(e.target.value)}
              style={{ minHeight: 100 }}
            />
          </div>
        )}
      </div>

      {/* Engineer Matches — gated behind JD review */}
      {matches.length > 0 && (
        <div className="spa-role-detail-section">
          <div className="spa-section-header">
            <h2 className="spa-heading-2">Engineer Matches</h2>
          </div>
          {jdReviewed ? (
            <div className="spa-match-cards">
              {matches.map(match => (
                <EngineerMatchCard
                  key={match.id}
                  match={match}
                  onDecision={handleMatchDecision}
                />
              ))}
            </div>
          ) : (
            <div className="spa-card-accent" style={{ textAlign: 'center', padding: '24px 32px' }}>
              <p className="spa-body-muted" style={{ fontStyle: 'italic' }}>
                {matches.length} {matches.length === 1 ? 'match' : 'matches'} ready. Review the JD and adjust dimension weights to see them.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Source info */}
      {role.source_url && (
        <div className="spa-role-detail-section">
          <div className="spa-section-header">
            <h2 className="spa-heading-2">Source</h2>
          </div>
          <p className="spa-body-small">
            <a href={role.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--spa-honey)' }}>
              {role.source_url}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
