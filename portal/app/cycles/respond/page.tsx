'use client'

import { useState } from 'react'

const SP2026_ENGINEERS = [
  'Aaron Williams',
  'Beckham Le',
  'Conor McManamon',
  'Erik Cavan',
  'Frank Sheikh',
  'German Alvarez',
  'John Hoeksema',
  'Jonathan Nolan',
  'Joseph P Waine',
  'Josh Upadhyay',
  'Julian Wemmie',
  'Kass ("Marianne") Botts',
  'Lily Luo',
  'Robert Hart',
  'Ulysse Pence',
]

const AVAILABILITY_OPTIONS = [
  { value: 'this-week', label: 'This week' },
  { value: 'next-week', label: 'Next week' },
  { value: 'flexible', label: 'Flexible — anytime works' },
]

export default function CyclesRespondPage() {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  function toggleEngineer(name: string) {
    setSelectedEngineers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
    setFieldErrors((prev) => ({ ...prev, engineers: '' }))
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!companyName.trim()) errors.companyName = 'Company name is required'
    if (!contactName.trim()) errors.contactName = 'Your name is required'
    if (!contactEmail.trim()) errors.contactEmail = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) errors.contactEmail = 'Please enter a valid email'
    if (selectedEngineers.length === 0) errors.engineers = 'Please select at least one engineer'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/cycles/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail,
          interested_engineers: selectedEngineers,
          availability: availability || null,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-fog, #F5F5F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="window" style={{ maxWidth: 560, width: '100%' }}>
          <div className="window-title">Response Received</div>
          <div className="window-content" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-xl, 18px)', fontWeight: 700, marginBottom: 'var(--space-5, 16px)' }}>
              Thanks for your interest.
            </p>
            <p style={{ color: 'var(--color-slate, #5A5A5A)', marginBottom: 'var(--space-7, 32px)' }}>
              We&apos;ll be in touch shortly to set up intro calls with the engineers you selected. Keep an eye on your inbox.
            </p>
            <a href="https://fractaltech.nyc" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-charcoal, #2C2C2C)', textDecoration: 'none' }}>
              &rarr; fractaltech.nyc
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-fog, #F5F5F0)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8, 48px)' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--color-charcoal, #2C2C2C)', marginBottom: 'var(--space-5, 16px)' }}>
            FRACTAL
          </div>
          <div style={{ borderBottom: '2px solid var(--color-charcoal, #2C2C2C)', marginBottom: 'var(--space-7, 32px)' }} />
          <div style={{ fontSize: 'var(--text-xs, 9px)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--color-slate, #5A5A5A)', marginBottom: 'var(--space-3, 8px)' }}>
            Cycles &mdash; Spring 2026
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl, 36px)', fontWeight: 700, color: 'var(--color-charcoal, #2C2C2C)', margin: 0, lineHeight: 1.2 }}>
            Tell us who you like.
          </h1>
          <p style={{ fontSize: 'var(--text-base, 16px)', lineHeight: 1.6, color: 'var(--color-slate, #5A5A5A)', marginTop: 'var(--space-5, 16px)' }}>
            Select the engineers you&apos;d like to meet and we&apos;ll set up intro calls this week.
          </p>
        </div>

        {/* Form */}
        <div className="window">
          <div className="window-title">Your Response</div>
          <div className="window-content">
            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-6, 24px)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className={`form-group ${fieldErrors.companyName ? 'error' : ''}`}>
                <label htmlFor="companyName">Company Name *</label>
                <input
                  id="companyName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Inc."
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setFieldErrors((prev) => ({ ...prev, companyName: '' })) }}
                />
                {fieldErrors.companyName && <div className="form-error">{fieldErrors.companyName}</div>}
              </div>

              <div className={`form-group ${fieldErrors.contactName ? 'error' : ''}`}>
                <label htmlFor="contactName">Your Name *</label>
                <input
                  id="contactName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jane Smith"
                  value={contactName}
                  onChange={(e) => { setContactName(e.target.value); setFieldErrors((prev) => ({ ...prev, contactName: '' })) }}
                />
                {fieldErrors.contactName && <div className="form-error">{fieldErrors.contactName}</div>}
              </div>

              <div className={`form-group ${fieldErrors.contactEmail ? 'error' : ''}`}>
                <label htmlFor="contactEmail">Email *</label>
                <input
                  id="contactEmail"
                  type="email"
                  className="form-input"
                  placeholder="e.g. jane@acme.com"
                  value={contactEmail}
                  onChange={(e) => { setContactEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, contactEmail: '' })) }}
                />
                {fieldErrors.contactEmail && <div className="form-error">{fieldErrors.contactEmail}</div>}
              </div>

              <div className={`form-group ${fieldErrors.engineers ? 'error' : ''}`}>
                <label>Which engineers are you interested in? *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3, 8px)', marginTop: 'var(--space-3, 8px)' }}>
                  {SP2026_ENGINEERS.map((name) => (
                    <label key={name} className="form-checkbox" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedEngineers.includes(name)}
                        onChange={() => toggleEngineer(name)}
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.engineers && <div className="form-error">{fieldErrors.engineers}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="availability">Availability for intro calls</label>
                <select
                  id="availability"
                  className="form-select"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="">Select availability...</option>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Anything else?</label>
                <textarea
                  id="notes"
                  className="form-input"
                  placeholder="Questions, specific interests, timeline notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Response'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
