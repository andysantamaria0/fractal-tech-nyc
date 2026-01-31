'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, trackEvent } from '@/lib/posthog'
import { useRouter } from 'next/navigation'

export default function CompleteProfilePage() {
  const [name, setName] = useState('')
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [newsletterOptin, setNewsletterOptin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signup')
        return
      }

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profile) {
        router.push('/dashboard')
        return
      }

      setCheckingAuth(false)
    }
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated. Please sign up again.')
      setLoading(false)
      return
    }

    // Upsert profile to handle retries gracefully
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      name,
      email: user.email!,
      company_linkedin: companyLinkedin,
      company_stage: companyStage,
      newsletter_optin: newsletterOptin,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Trigger HubSpot sync (non-blocking)
    try {
      await fetch('/api/auth/hubspot-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch {
      console.error('HubSpot sync failed')
    }

    // PostHog: identify user and track signup
    identifyUser(user.id, {
      email: user.email,
      name,
      company_stage: companyStage,
      newsletter_optin: newsletterOptin,
    })
    trackEvent('user_signed_up', {
      auth_method: user.app_metadata?.provider || 'email',
      company_stage: companyStage,
      newsletter_optin: newsletterOptin,
    })

    router.push('/dashboard')
  }

  if (checkingAuth) {
    return (
      <div className="auth-page">
        <div className="auth-window">
          <div className="hero-window">
            <div className="hero-title-bar">COMPLETE YOUR PROFILE</div>
            <div className="window-content">
              <div className="loading-text">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-window">
        <div className="hero-window">
          <div className="hero-title-bar">COMPLETE YOUR PROFILE</div>
          <div className="window-content">
            <div className="auth-header">
              <h1>Almost There</h1>
              <p>Tell us about your company</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label htmlFor="name">Your Name *</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyLinkedin">Company LinkedIn URL *</label>
                <input
                  id="companyLinkedin"
                  type="url"
                  className="form-input"
                  placeholder="https://linkedin.com/company/..."
                  value={companyLinkedin}
                  onChange={(e) => setCompanyLinkedin(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyStage">Company Stage *</label>
                <select
                  id="companyStage"
                  className="form-select"
                  value={companyStage}
                  onChange={(e) => setCompanyStage(e.target.value)}
                  required
                >
                  <option value="">Select stage...</option>
                  <option value="bootstrapped">Bootstrapped</option>
                  <option value="angel">Angel</option>
                  <option value="pre-seed">Pre-Seed</option>
                  <option value="seed">Seed</option>
                  <option value="bigger">Series A+</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={newsletterOptin}
                    onChange={(e) => setNewsletterOptin(e.target.checked)}
                  />
                  <span>Send me bi-weekly cohort updates</span>
                </label>
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
