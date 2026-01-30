'use client'

import { useState, useEffect } from 'react'
import EngineerAssignment from './EngineerAssignment'

interface Submission {
  id: string
  title: string
  description: string
  status: string
  timeline: string
  tech_stack?: string
  is_hiring: boolean
  hiring_types?: string[]
  created_at: string
  sprint_start_date?: string
  sprint_end_date?: string
  hours_budget?: number
  hours_logged?: number
  internal_notes?: string
  cancelled_reason?: string
  assigned_engineer_id?: string
  hubspot_note_id?: string
  profiles?: { name: string; email: string; company_linkedin: string; hubspot_contact_id?: string; hubspot_company_id?: string }
  assigned_engineer?: { id: string; name: string; email: string } | null
  preferred_engineer?: { id: string; name: string } | null
}

interface HistoryEntry {
  id: string
  field_name: string
  old_value?: string
  new_value?: string
  note?: string
  created_at: string
  profiles?: { name: string }
}

const STATUS_OPTIONS = [
  'submitted', 'reviewing', 'posted', 'matched', 'in_progress', 'completed', 'cancelled',
]

interface SubmissionDetailProps {
  submissionId: string
  onClose: () => void
  onUpdated: () => void
}

export default function SubmissionDetail({ submissionId, onClose, onUpdated }: SubmissionDetailProps) {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Editable fields
  const [status, setStatus] = useState('')
  const [assignedEngineerId, setAssignedEngineerId] = useState<string | null>(null)
  const [internalNotes, setInternalNotes] = useState('')
  const [sprintStart, setSprintStart] = useState('')
  const [sprintEnd, setSprintEnd] = useState('')
  const [hoursBudget, setHoursBudget] = useState('')
  const [hoursLogged, setHoursLogged] = useState('')
  const [cancelledReason, setCancelledReason] = useState('')

  useEffect(() => {
    loadData()
  }, [submissionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    try {
      const [subRes, histRes] = await Promise.all([
        fetch(`/api/admin/cycles/${submissionId}`),
        fetch(`/api/admin/cycles/${submissionId}/history`),
      ])

      if (subRes.ok) {
        const { submission: sub } = await subRes.json()
        setSubmission(sub)
        setStatus(sub.status)
        setAssignedEngineerId(sub.assigned_engineer_id || null)
        setInternalNotes(sub.internal_notes || '')
        setSprintStart(sub.sprint_start_date || '')
        setSprintEnd(sub.sprint_end_date || '')
        setHoursBudget(sub.hours_budget?.toString() || '')
        setHoursLogged(sub.hours_logged?.toString() || '')
        setCancelledReason(sub.cancelled_reason || '')
      }

      if (histRes.ok) {
        const { history: hist } = await histRes.json()
        setHistory(hist)
      }
    } catch (e) {
      setError('Failed to load submission')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/cycles/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          assigned_engineer_id: assignedEngineerId,
          internal_notes: internalNotes,
          sprint_start_date: sprintStart || null,
          sprint_end_date: sprintEnd || null,
          hours_budget: hoursBudget ? parseInt(hoursBudget) : null,
          hours_logged: hoursLogged ? parseInt(hoursLogged) : null,
          cancelled_reason: status === 'cancelled' ? cancelledReason : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }

      onUpdated()
      loadData()
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

  if (!submission) {
    return (
      <div className="admin-detail-panel">
        <div className="loading-text">Submission not found</div>
      </div>
    )
  }

  return (
    <div className="admin-detail-panel">
      <div className="admin-detail-header">
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{submission.title}</h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        {/* Company Info */}
        <div className="admin-detail-section">
          <div className="section-label">Company</div>
          <p><strong>{submission.profiles?.name}</strong> ({submission.profiles?.email})</p>
          {submission.profiles?.company_linkedin && (
            <a href={submission.profiles.company_linkedin} target="_blank" rel="noopener noreferrer" className="engineer-link">
              LinkedIn
            </a>
          )}
        </div>

        {/* Description */}
        <div className="admin-detail-section">
          <div className="section-label">Description</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{submission.description}</p>
        </div>

        {/* Meta */}
        <div className="admin-detail-section">
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div className="cohort-stat">Timeline: {submission.timeline.replace('-', ' ')}</div>
            {submission.tech_stack && <div className="cohort-stat">Tech: {submission.tech_stack}</div>}
            <div className="cohort-stat">Hiring: {submission.is_hiring ? `Yes (${(submission.hiring_types || []).join(', ')})` : 'No'}</div>
          </div>
        </div>

        {submission.preferred_engineer && (
          <div className="admin-detail-section">
            <div className="section-label">Preferred Engineer</div>
            <p>{submission.preferred_engineer.name}</p>
          </div>
        )}

        {/* Status */}
        <div className="admin-detail-section">
          <label htmlFor="detail-status" style={{ display: 'block', marginBottom: 'var(--space-3)', fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status
          </label>
          <select
            id="detail-status"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {status === 'cancelled' && (
          <div className="admin-detail-section">
            <label htmlFor="cancel-reason" style={{ display: 'block', marginBottom: 'var(--space-3)', fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cancellation Reason
            </label>
            <textarea
              id="cancel-reason"
              className="form-input"
              value={cancelledReason}
              onChange={(e) => setCancelledReason(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Engineer Assignment */}
        <div className="admin-detail-section">
          <EngineerAssignment
            currentEngineerId={assignedEngineerId || undefined}
            onAssign={setAssignedEngineerId}
          />
        </div>

        {/* Sprint */}
        <div className="admin-detail-section">
          <div className="section-label">Sprint</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="sprint-start" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Start</label>
              <input
                id="sprint-start"
                type="date"
                className="form-input"
                value={sprintStart}
                onChange={(e) => setSprintStart(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="sprint-end" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>End</label>
              <input
                id="sprint-end"
                type="date"
                className="form-input"
                value={sprintEnd}
                onChange={(e) => setSprintEnd(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="hours-budget" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Hours Budget</label>
              <input
                id="hours-budget"
                type="number"
                className="form-input"
                value={hoursBudget}
                onChange={(e) => setHoursBudget(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="hours-logged" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Hours Logged</label>
              <input
                id="hours-logged"
                type="number"
                className="form-input"
                value={hoursLogged}
                onChange={(e) => setHoursLogged(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <div className="admin-detail-section">
          <label htmlFor="internal-notes" style={{ display: 'block', marginBottom: 'var(--space-3)', fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Internal Notes (Admin Only)
          </label>
          <textarea
            id="internal-notes"
            className="form-input"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Save Button */}
        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* HubSpot Link */}
        {submission.hubspot_note_id && (
          <div className="admin-detail-section" style={{ marginTop: 'var(--space-5)' }}>
            <a
              href={`https://app.hubspot.com/contacts/${process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="engineer-link"
            >
              View in HubSpot
            </a>
          </div>
        )}

        {/* History Timeline */}
        {history.length > 0 && (
          <div className="admin-detail-section" style={{ marginTop: 'var(--space-6)' }}>
            <div className="section-label">History</div>
            <div className="admin-history">
              {history.map((entry) => (
                <div key={entry.id} className="admin-history-entry">
                  <div className="admin-history-meta">
                    <span className="admin-history-who">{entry.profiles?.name || 'System'}</span>
                    <span className="admin-history-when">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="admin-history-change">
                    Changed <strong>{entry.field_name.replace('_', ' ')}</strong>
                    {entry.old_value && <> from <em>{entry.old_value}</em></>}
                    {entry.new_value && <> to <em>{entry.new_value}</em></>}
                  </div>
                  {entry.note && <div className="admin-history-note">{entry.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
