'use client'

import { useState } from 'react'

const COMPANY_STAGES = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'angel', label: 'Angel' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'bigger', label: 'Series A+' },
]

interface AddCompanyFormProps {
  onClose: () => void
  onSaved: () => void
}

export default function AddCompanyForm({ onClose, onSaved }: AddCompanyFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [sendWelcome, setSendWelcome] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setInviteLink('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          company_linkedin: companyLinkedin,
          company_stage: companyStage,
          send_welcome: sendWelcome,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite')
      }

      setSuccess(`Invited ${email} successfully.`)
      if (data.inviteLink) {
        setInviteLink(data.inviteLink)
      }
      setEmail('')
      setName('')
      setCompanyLinkedin('')
      setCompanyStage('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-detail-panel">
      <div className="admin-detail-header">
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          Add Company
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          {success}
          {inviteLink && (
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <strong>Invite link (backup):</strong>{' '}
              <a href={inviteLink} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                {inviteLink}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="admin-detail-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="add-co-email" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Email *</label>
            <input
              id="add-co-email"
              type="email"
              className="form-input"
              placeholder="founder@startup.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-co-name" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Contact Name *</label>
            <input
              id="add-co-name"
              type="text"
              className="form-input"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-co-linkedin" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Company LinkedIn URL *</label>
            <input
              id="add-co-linkedin"
              type="url"
              className="form-input"
              placeholder="https://linkedin.com/company/..."
              value={companyLinkedin}
              onChange={(e) => setCompanyLinkedin(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-co-stage" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>Company Stage *</label>
            <select
              id="add-co-stage"
              className="form-select"
              value={companyStage}
              onChange={(e) => setCompanyStage(e.target.value)}
              required
            >
              <option value="">Select stage...</option>
              {COMPANY_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={sendWelcome}
                onChange={(e) => setSendWelcome(e.target.checked)}
              />
              <span>Send welcome email</span>
            </label>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Inviting...' : 'Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}
