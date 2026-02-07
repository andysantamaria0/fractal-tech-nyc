'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const FOCUS_AREA_OPTIONS = [
  'React', 'Next.js', 'TypeScript', 'Python', 'Node.js', 'PostgreSQL',
  'AI/ML', 'Data Pipelines', 'DevOps', 'Mobile', 'React Native',
  'GraphQL', 'APIs', 'Cloud', 'Security', 'Blockchain',
]

export default function EngineerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isNew, setIsNew] = useState(true)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [whatExcitesYou, setWhatExcitesYou] = useState('')
  const [availabilityStart, setAvailabilityStart] = useState('')
  const [availabilityHours, setAvailabilityHours] = useState('')
  const [availabilityDuration, setAvailabilityDuration] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setEmail(user.email || '')

      const { data: engineer } = await supabase
        .from('engineers')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle()

      if (engineer) {
        setIsNew(false)
        setName(engineer.name)
        setPhotoUrl(engineer.photo_url || '')
        setGithubUrl(engineer.github_url)
        setFocusAreas(engineer.focus_areas || [])
        setWhatExcitesYou(engineer.what_excites_you || '')
        setAvailabilityStart(engineer.availability_start || '')
        setAvailabilityHours(engineer.availability_hours_per_week?.toString() || '')
        setAvailabilityDuration(engineer.availability_duration_weeks?.toString() || '')
        setLinkedinUrl(engineer.linkedin_url || '')
        setPortfolioUrl(engineer.portfolio_url || '')
      }

      setLoading(false)
    }
    loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFocusToggle(area: string) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('engineer-headshots')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError('Photo upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from('engineer-headshots')
      .getPublicUrl(data.path)

    setPhotoUrl(publicUrl.publicUrl)
    setUploading(false)
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required'
    if (!githubUrl.trim()) return 'GitHub URL is required'
    if (!githubUrl.startsWith('https://github.com/')) return 'GitHub URL must start with https://github.com/'
    if (linkedinUrl && !linkedinUrl.startsWith('https://')) return 'LinkedIn URL must start with https://'
    if (portfolioUrl && !portfolioUrl.startsWith('https://')) return 'Portfolio URL must start with https://'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/engineer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          photo_url: photoUrl || null,
          github_url: githubUrl,
          focus_areas: focusAreas,
          what_excites_you: whatExcitesYou || null,
          availability_start: availabilityStart || null,
          availability_hours_per_week: availabilityHours ? parseInt(availabilityHours) : null,
          availability_duration_weeks: availabilityDuration ? parseInt(availabilityDuration) : null,
          linkedin_url: linkedinUrl || null,
          portfolio_url: portfolioUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      setSuccess('Profile saved successfully.')
      setIsNew(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="window" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="window-title">Engineer Profile</div>
          <div className="window-content">
            <div className="loading-text">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="window" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="window-title">{isNew ? 'Create' : 'Edit'} Engineer Profile</div>
        <div className="window-content">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="eng-name">Full Name *</label>
              <input
                id="eng-name"
                type="text"
                className="form-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="eng-email">Email</label>
              <input
                id="eng-email"
                type="email"
                className="form-input"
                value={email}
                disabled
              />
            </div>

            {/* Photo upload */}
            <div className="form-group">
              <label>Profile Photo</label>
              {photoUrl && (
                <div className="engineer-photo" style={{ marginBottom: 'var(--space-3)' }}>
                  <img src={photoUrl} alt="Profile" />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="form-input"
                onChange={handlePhotoUpload}
              />
              {uploading && <div className="loading-text" style={{ textAlign: 'left', padding: 'var(--space-2) 0' }}>Uploading...</div>}
            </div>

            <div className="form-group">
              <label htmlFor="eng-github">GitHub URL *</label>
              <input
                id="eng-github"
                type="url"
                className="form-input"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Focus Areas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {FOCUS_AREA_OPTIONS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    className="engineer-tag"
                    style={{
                      cursor: 'pointer',
                      background: focusAreas.includes(area) ? 'var(--color-charcoal)' : 'var(--color-platinum)',
                      color: focusAreas.includes(area) ? 'var(--color-white)' : 'var(--color-charcoal)',
                    }}
                    onClick={() => handleFocusToggle(area)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eng-excites">What Excites You</label>
              <textarea
                id="eng-excites"
                className="form-input"
                placeholder="What kind of work are you most excited about?"
                value={whatExcitesYou}
                onChange={(e) => setWhatExcitesYou(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="section-label" style={{ marginTop: 'var(--space-6)' }}>Availability</div>

            <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="eng-avail-start">Start Date</label>
                <input
                  id="eng-avail-start"
                  type="date"
                  className="form-input"
                  value={availabilityStart}
                  onChange={(e) => setAvailabilityStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="eng-avail-hours">Hours/Week</label>
                <input
                  id="eng-avail-hours"
                  type="number"
                  className="form-input"
                  placeholder="20"
                  value={availabilityHours}
                  onChange={(e) => setAvailabilityHours(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="eng-avail-duration">Duration (weeks)</label>
                <input
                  id="eng-avail-duration"
                  type="number"
                  className="form-input"
                  placeholder="4"
                  value={availabilityDuration}
                  onChange={(e) => setAvailabilityDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eng-linkedin">LinkedIn URL</label>
              <input
                id="eng-linkedin"
                type="url"
                className="form-input"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="eng-portfolio">Portfolio URL</label>
              <input
                id="eng-portfolio"
                type="url"
                className="form-input"
                placeholder="https://yoursite.dev"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create Profile' : 'Save Changes'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            <Link href="/dashboard" className="engineer-link">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
