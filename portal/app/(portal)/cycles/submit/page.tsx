'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/posthog'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Engineer {
  id: string
  name: string
}

const TIMELINE_OPTIONS = [
  { value: 'no-rush', label: 'No Rush' },
  { value: '2-weeks', label: '2 Weeks' },
  { value: '1-month', label: '1 Month' },
  { value: 'urgent', label: 'Urgent' },
]

const HIRING_OPTIONS = [
  { value: 'interns', label: 'Yes, Interns' },
  { value: 'contract', label: 'Yes, Contract' },
  { value: 'full-time', label: 'Yes, Full-Time' },
  { value: 'no', label: 'No' },
]

export default function SubmitFeaturePage() {
  const searchParams = useSearchParams()
  const preselectedEngineer = searchParams.get('engineer')

  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeline, setTimeline] = useState('')
  const [techStack, setTechStack] = useState('')
  const [preferredEngineerId, setPreferredEngineerId] = useState(preselectedEngineer || '')
  const [hiringSelections, setHiringSelections] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    trackEvent('feature_submission_started', {
      engineer_id: preselectedEngineer || undefined,
    })

    async function loadEngineers() {
      const { data } = await supabase
        .from('engineers')
        .select('id, name')
        .eq('is_available_for_cycles', true)
        .order('name')

      if (data) setEngineers(data)
    }
    loadEngineers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleHiringToggle(value: string) {
    if (value === 'no') {
      // "No" deselects everything else
      setHiringSelections((prev) => prev.includes('no') ? [] : ['no'])
    } else {
      // Any "Yes" option deselects "No"
      setHiringSelections((prev) => {
        const without = prev.filter((v) => v !== 'no')
        return without.includes(value)
          ? without.filter((v) => v !== value)
          : [...without, value]
      })
    }
  }

  // Derived values for submission
  const isHiring = hiringSelections.length > 0 && !hiringSelections.includes('no')
  const hiringTypes = hiringSelections.filter((v) => v !== 'no')

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required'
    else if (title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
    if (!description.trim()) errors.description = 'Description is required'
    else if (description.trim().length < 20) errors.description = 'Please provide more detail (at least 20 characters)'
    if (!timeline) errors.timeline = 'Please select a timeline'
    if (hiringSelections.length === 0) errors.hiring = 'Please indicate your hiring status'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          timeline,
          tech_stack: techStack || null,
          preferred_engineer_id: preferredEngineerId || null,
          is_hiring: isHiring,
          hiring_types: hiringTypes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      trackEvent('feature_submission_completed', {
        engineer_id: preferredEngineerId || undefined,
        timeline,
        hiring_status: isHiring,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="dashboard">
        <div className="window" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="window-title">Submission Received</div>
          <div className="window-content" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              Your feature request has been submitted.
            </p>
            <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
              Our team will review it and match you with an engineer. You&apos;ll hear from us soon.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="btn-primary">
                Back to Dashboard
              </Link>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSubmitted(false)
                  setTitle('')
                  setDescription('')
                  setTimeline('')
                  setTechStack('')
                  setPreferredEngineerId('')
                  setHiringSelections([])
                }}
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="window" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="window-title">Submit Feature Request</div>
        <div className="window-content">
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Tell us about a feature or project you&apos;d like one of our engineers to build.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${fieldErrors.title ? 'error' : ''}`}>
              <label htmlFor="title">Feature Title *</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="e.g. Build a Stripe integration"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => ({ ...prev, title: '' })) }}
                required
              />
              {fieldErrors.title && <div className="form-error">{fieldErrors.title}</div>}
            </div>

            <div className={`form-group ${fieldErrors.description ? 'error' : ''}`}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                className="form-input"
                placeholder="Describe the feature, goals, and any requirements..."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors((prev) => ({ ...prev, description: '' })) }}
                required
                rows={5}
                style={{ resize: 'vertical' }}
              />
              {fieldErrors.description && <div className="form-error">{fieldErrors.description}</div>}
            </div>

            <div className={`form-group ${fieldErrors.timeline ? 'error' : ''}`}>
              <label htmlFor="timeline">Timeline *</label>
              <select
                id="timeline"
                className="form-select"
                value={timeline}
                onChange={(e) => { setTimeline(e.target.value); setFieldErrors((prev) => ({ ...prev, timeline: '' })) }}
                required
              >
                <option value="">Select timeline...</option>
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.timeline && <div className="form-error">{fieldErrors.timeline}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="techStack">Tech Stack</label>
              <input
                id="techStack"
                type="text"
                className="form-input"
                placeholder="e.g. React, Node.js, PostgreSQL"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="engineer">Preferred Engineer</label>
              <select
                id="engineer"
                className="form-select"
                value={preferredEngineerId}
                onChange={(e) => setPreferredEngineerId(e.target.value)}
              >
                <option value="">No preference</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`form-group ${fieldErrors.hiring ? 'error' : ''}`}>
              <label>Is your company hiring? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {HIRING_OPTIONS.map((opt) => (
                  <label key={opt.value} className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={hiringSelections.includes(opt.value)}
                      onChange={() => { handleHiringToggle(opt.value); setFieldErrors((prev) => ({ ...prev, hiring: '' })) }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.hiring && <div className="form-error">{fieldErrors.hiring}</div>}
            </div>

            <button
              type="submit"
              className="btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Feature Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
