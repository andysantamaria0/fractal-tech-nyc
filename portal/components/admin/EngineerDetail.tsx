'use client'

import { useState, useEffect } from 'react'

interface Engineer {
  id: string
  name: string
  email: string
  photo_url?: string
  github_url?: string
  github_username?: string
  focus_areas?: string[]
  what_excites_you?: string
  availability_start?: string
  availability_hours_per_week?: number
  availability_duration_weeks?: number
  linkedin_url?: string
  portfolio_url?: string
  is_available_for_cycles: boolean
}

interface EngineerDetailProps {
  engineerId: string | 'new'
  onClose: () => void
  onSaved: () => void
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-2)',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
}

export default function EngineerDetail({ engineerId, onClose, onSaved }: EngineerDetailProps) {
  const isNew = engineerId === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [focusAreas, setFocusAreas] = useState('')
  const [whatExcitesYou, setWhatExcitesYou] = useState('')
  const [availabilityStart, setAvailabilityStart] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('')
  const [durationWeeks, setDurationWeeks] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    if (isNew) return
    loadEngineer()
  }, [engineerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEngineer() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/engineers`)
      if (res.ok) {
        const { engineers } = await res.json()
        const eng = engineers.find((e: Engineer) => e.id === engineerId)
        if (eng) {
          setName(eng.name || '')
          setEmail(eng.email || '')
          setGithubUrl(eng.github_url || '')
          setGithubUsername(eng.github_username || '')
          setFocusAreas((eng.focus_areas || []).join(', '))
          setWhatExcitesYou(eng.what_excites_you || '')
          setAvailabilityStart(eng.availability_start || '')
          setHoursPerWeek(eng.availability_hours_per_week?.toString() || '')
          setDurationWeeks(eng.availability_duration_weeks?.toString() || '')
          setLinkedinUrl(eng.linkedin_url || '')
          setPortfolioUrl(eng.portfolio_url || '')
          setAvailable(eng.is_available_for_cycles)
        }
      }
    } catch {
      setError('Failed to load engineer')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      email: email.trim(),
      github_url: githubUrl.trim() || null,
      github_username: githubUsername.trim() || null,
      focus_areas: focusAreas.trim()
        ? focusAreas.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      what_excites_you: whatExcitesYou.trim() || null,
      availability_start: availabilityStart || null,
      availability_hours_per_week: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
      availability_duration_weeks: durationWeeks ? parseInt(durationWeeks, 10) : null,
      linkedin_url: linkedinUrl.trim() || null,
      portfolio_url: portfolioUrl.trim() || null,
      is_available_for_cycles: available,
    }

    if (!payload.name || !payload.email) {
      setError('Name and email are required')
      setSaving(false)
      return
    }

    try {
      const url = isNew ? '/api/admin/engineers' : `/api/admin/engineers/${engineerId}`
      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-detail-panel">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  return (
    <div className="admin-detail-panel">
      <div className="admin-detail-header">
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          {isNew ? 'Add Engineer' : 'Edit Engineer'}
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        {/* Name & Email */}
        <div className="admin-detail-section">
          <div className="section-label">Basic Info</div>
          <div className="form-group">
            <label htmlFor="eng-name" style={labelStyle}>Name</label>
            <input
              id="eng-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="eng-email" style={labelStyle}>Email</label>
            <input
              id="eng-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* GitHub */}
        <div className="admin-detail-section">
          <div className="section-label">GitHub</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-github-url" style={labelStyle}>GitHub URL</label>
              <input
                id="eng-github-url"
                type="url"
                className="form-input"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-github-user" style={labelStyle}>Username</label>
              <input
                id="eng-github-user"
                type="text"
                className="form-input"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="username"
              />
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="admin-detail-section">
          <div className="form-group">
            <label htmlFor="eng-focus" style={labelStyle}>Focus Areas (comma-separated)</label>
            <input
              id="eng-focus"
              type="text"
              className="form-input"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="React, Node.js, AI/ML"
            />
          </div>
        </div>

        {/* What excites you */}
        <div className="admin-detail-section">
          <div className="form-group">
            <label htmlFor="eng-excites" style={labelStyle}>What Excites You</label>
            <textarea
              id="eng-excites"
              className="form-input"
              value={whatExcitesYou}
              onChange={(e) => setWhatExcitesYou(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Availability */}
        <div className="admin-detail-section">
          <div className="section-label">Availability</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-avail-start" style={labelStyle}>Start Date</label>
              <input
                id="eng-avail-start"
                type="date"
                className="form-input"
                value={availabilityStart}
                onChange={(e) => setAvailabilityStart(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-hours" style={labelStyle}>Hours/Week</label>
              <input
                id="eng-hours"
                type="number"
                className="form-input"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-weeks" style={labelStyle}>Duration (weeks)</label>
              <input
                id="eng-weeks"
                type="number"
                className="form-input"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="admin-detail-section">
          <div className="section-label">Links</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-linkedin" style={labelStyle}>LinkedIn</label>
              <input
                id="eng-linkedin"
                type="url"
                className="form-input"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="eng-portfolio" style={labelStyle}>Portfolio</label>
              <input
                id="eng-portfolio"
                type="url"
                className="form-input"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Available Toggle */}
        <div className="admin-detail-section">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            <span>Available for Cycles</span>
          </label>
        </div>

        {/* Save Button */}
        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : isNew ? 'Create Engineer' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
