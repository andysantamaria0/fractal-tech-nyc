'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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

const HIRING_TYPE_OPTIONS = [
  { value: 'contract', label: 'Contract Engineers' },
  { value: 'interns', label: 'Interns' },
  { value: 'full-time', label: 'Full-Time Hires' },
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
  const [isHiring, setIsHiring] = useState(false)
  const [hiringTypes, setHiringTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
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

  function handleHiringTypeToggle(type: string) {
    setHiringTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
          hiring_types: isHiring ? hiringTypes : [],
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
                  setIsHiring(false)
                  setHiringTypes([])
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
            <div className="form-group">
              <label htmlFor="title">Feature Title *</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="e.g. Build a Stripe integration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                className="form-input"
                placeholder="Describe the feature, goals, and any requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeline">Timeline *</label>
              <select
                id="timeline"
                className="form-select"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                required
              >
                <option value="">Select timeline...</option>
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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

            <div className="form-group">
              <label>Are you hiring?</label>
              <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)' }}>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="isHiring"
                    checked={!isHiring}
                    onChange={() => {
                      setIsHiring(false)
                      setHiringTypes([])
                    }}
                  />
                  <span>No</span>
                </label>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="isHiring"
                    checked={isHiring}
                    onChange={() => setIsHiring(true)}
                  />
                  <span>Yes</span>
                </label>
              </div>
            </div>

            {isHiring && (
              <div className="form-group">
                <label>What types of roles?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                  {HIRING_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={hiringTypes.includes(opt.value)}
                        onChange={() => handleHiringTypeToggle(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
