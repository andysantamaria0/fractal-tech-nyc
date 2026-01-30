'use client'

import { useState } from 'react'

const COMPANY_STAGES = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'angel', label: 'Angel' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'bigger', label: 'Series A+' },
]

export default function AdminInvitePage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [sendWelcome, setSendWelcome] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
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
      setEmail('')
      setName('')
      setCompanyLinkedin('')
      setCompanyStage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="window" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="window-title">Invite Company</div>
        <div className="window-content">
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Send an invitation to a company to join the Fractal Partners Portal.
          </p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="invite-email">Email *</label>
              <input
                id="invite-email"
                type="email"
                className="form-input"
                placeholder="founder@startup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="invite-name">Contact Name *</label>
              <input
                id="invite-name"
                type="text"
                className="form-input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="invite-linkedin">Company LinkedIn URL *</label>
              <input
                id="invite-linkedin"
                type="url"
                className="form-input"
                placeholder="https://linkedin.com/company/..."
                value={companyLinkedin}
                onChange={(e) => setCompanyLinkedin(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="invite-stage">Company Stage *</label>
              <select
                id="invite-stage"
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
    </div>
  )
}
