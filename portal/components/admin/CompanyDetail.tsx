'use client'

import { useState, useEffect } from 'react'
import type { Company } from '@/lib/types'
import { labelStyle, COMPANY_STAGES } from '@/lib/constants'

interface CompanyDetailProps {
  companyId: string
  onClose: () => void
  onSaved: () => void
}

export default function CompanyDetail({ companyId, onClose, onSaved }: CompanyDetailProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<Company | null>(null)

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [newsletterOptin, setNewsletterOptin] = useState(false)

  useEffect(() => {
    loadCompany()
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCompany() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`)
      if (res.ok) {
        const { company: co } = await res.json()
        setCompany(co)
        setName(co.name || '')
        setCompanyName(co.company_name || '')
        setCompanyLinkedin(co.company_linkedin || '')
        setCompanyStage(co.company_stage || '')
        setNewsletterOptin(co.newsletter_optin || false)
      } else {
        setError('Failed to load company')
      }
    } catch {
      setError('Failed to load company')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company_name: companyName.trim() || null,
          company_linkedin: companyLinkedin.trim() || null,
          company_stage: companyStage || null,
          newsletter_optin: newsletterOptin,
        }),
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
          Company Detail
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        {/* Read-only info */}
        {company && (
          <div className="admin-detail-section">
            <div className="section-label">Info</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
              <strong>Joined:</strong> {new Date(company.created_at).toLocaleDateString()}
            </p>
            {company.hubspot_contact_id && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
                <strong>HubSpot Contact:</strong> {company.hubspot_contact_id}
              </p>
            )}
            {company.hubspot_company_id && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
                <strong>HubSpot Company:</strong> {company.hubspot_company_id}
              </p>
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="admin-detail-section">
          <div className="section-label">Edit</div>
          <div className="form-group">
            <label htmlFor="co-company-name" style={labelStyle}>Company Name</label>
            <input
              id="co-company-name"
              type="text"
              className="form-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-name" style={labelStyle}>Contact Name</label>
            <input
              id="co-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-linkedin" style={labelStyle}>Company LinkedIn URL</label>
            <input
              id="co-linkedin"
              type="url"
              className="form-input"
              value={companyLinkedin}
              onChange={(e) => setCompanyLinkedin(e.target.value)}
              placeholder="https://linkedin.com/company/..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-stage" style={labelStyle}>Company Stage</label>
            <select
              id="co-stage"
              className="form-select"
              value={companyStage}
              onChange={(e) => setCompanyStage(e.target.value)}
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
                checked={newsletterOptin}
                onChange={(e) => setNewsletterOptin(e.target.checked)}
              />
              <span>Newsletter Opt-in</span>
            </label>
          </div>
        </div>

        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
