'use client'

import { useState, useEffect } from 'react'

interface HighlightDetailProps {
  highlightId: string | 'new'
  currentWeek: number
  cohortStartDate: string
  onClose: () => void
  onSaved: () => void
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-2)',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
}

export default function HighlightDetail({
  highlightId,
  currentWeek,
  cohortStartDate,
  onClose,
  onSaved,
}: HighlightDetailProps) {
  const isNew = highlightId === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [weekNumber, setWeekNumber] = useState(isNew ? currentWeek : 0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isNew) return
    loadHighlight()
  }, [highlightId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHighlight() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/highlights/${highlightId}`)
      if (res.ok) {
        const { highlight: h } = await res.json()
        setWeekNumber(h.week_number)
        setTitle(h.title || '')
        setDescription(h.description || '')
      } else {
        setError('Failed to load highlight')
      }
    } catch {
      setError('Failed to load highlight')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!weekNumber || !description.trim()) {
      setError('Week number and description are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = isNew ? '/api/admin/highlights' : `/api/admin/highlights/${highlightId}`
      const method = isNew ? 'POST' : 'PATCH'

      const body: Record<string, unknown> = {
        week_number: weekNumber,
        title: title.trim() || null,
        description: description.trim(),
      }
      if (isNew) {
        body.cohort_start_date = cohortStartDate
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  async function handleDelete() {
    if (!confirm('Delete this highlight?')) return
    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/highlights/${highlightId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
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
          {isNew ? 'Add Highlight' : 'Edit Highlight'}
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-4)' }}>
          Current week is <strong>{currentWeek}</strong>
        </p>

        <div className="form-group">
          <label htmlFor="hl-week" style={labelStyle}>Week Number</label>
          <input
            id="hl-week"
            type="number"
            className="form-input"
            value={weekNumber}
            onChange={(e) => setWeekNumber(parseInt(e.target.value) || 0)}
            min={1}
            style={{ maxWidth: 120 }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="hl-title" style={labelStyle}>Title</label>
          <input
            id="hl-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint Week"
          />
        </div>

        <div className="form-group">
          <label htmlFor="hl-description" style={labelStyle}>Description</label>
          <textarea
            id="hl-description"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Week description... HTML links like <a href=&quot;...&quot;>text</a> are supported."
            rows={5}
            style={{ resize: 'vertical' }}
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
            Supports HTML links: &lt;a href=&quot;...&quot;&gt;link text&lt;/a&gt;
          </p>
        </div>

        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : isNew ? 'Create Highlight' : 'Save Changes'}
        </button>

        {!isNew && (
          <button
            className="btn-secondary btn-full"
            onClick={handleDelete}
            disabled={deleting}
            style={{ marginTop: 'var(--space-3)', color: 'var(--color-red, #c00)' }}
          >
            {deleting ? 'Deleting...' : 'Delete Highlight'}
          </button>
        )}
      </div>
    </div>
  )
}
