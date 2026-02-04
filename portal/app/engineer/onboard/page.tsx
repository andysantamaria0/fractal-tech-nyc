'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EngineerData {
  id: string
  name: string
  email: string
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  resume_url: string | null
}

export default function EngineerOnboardPage() {
  const [engineer, setEngineer] = useState<EngineerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadEngineer() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if already has profile — only redirect if past onboarding
      const res = await fetch('/api/engineer/me')
      if (res.ok) {
        const data = await res.json()
        if (data.profile && data.profile.status !== 'draft') {
          router.push('/engineer/dashboard')
          return
        }
      }

      // Load from engineers table
      const { data: eng } = await supabase
        .from('engineers')
        .select('id, name, email, github_url, linkedin_url, portfolio_url, resume_url')
        .eq('email', user.email!)
        .single()

      if (eng) {
        setEngineer(eng)
        setName(eng.name)
        setLinkedinUrl(eng.linkedin_url || '')
        setGithubUrl(eng.github_url || '')
        setPortfolioUrl(eng.portfolio_url || '')
        setResumeUrl(eng.resume_url || '')
      } else {
        // No engineer record — pre-fill from auth
        setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')
      }
      setLoading(false)
    }
    loadEngineer()
  }, [supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/engineer/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineer_id: engineer?.id || null,
          name,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          resume_url: resumeUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create profile')
      }

      router.push('/engineer/questionnaire')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-window">
          <div className="hero-window">
            <div className="hero-title-bar">LOADING</div>
            <div className="window-content">
              <p>Loading your information...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page engineer-onboard-page">
      <div className="auth-window">
        <div className="hero-window">
          <div className="hero-title-bar">ENGINEER ONBOARDING</div>
          <div className="window-content">
            <div className="auth-header">
              <h1>Welcome to Fractal</h1>
              <p>We&apos;ll match you with your best-fit jobs in 3 steps:</p>
            </div>

            <div className="engineer-onboard-steps">
              <div className="engineer-onboard-step engineer-onboard-step-active">
                <span className="engineer-step-number">1</span>
                <div>
                  <strong>Share your links</strong>
                  <span className="engineer-step-desc">We&apos;ll analyze your GitHub, portfolio, and LinkedIn to build your technical profile.</span>
                </div>
              </div>
              <div className="engineer-onboard-step">
                <span className="engineer-step-number">2</span>
                <div>
                  <strong>Quick questionnaire</strong>
                  <span className="engineer-step-desc">Tell us what you&apos;re looking for in your next role (5 min).</span>
                </div>
              </div>
              <div className="engineer-onboard-step">
                <span className="engineer-step-number">3</span>
                <div>
                  <strong>Get matched</strong>
                  <span className="engineer-step-desc">We score hundreds of jobs against your profile and show your top 10.</span>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="github">GitHub URL</label>
                <input
                  id="github"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <span className="form-hint">We&apos;ll analyze your repos to understand your technical strengths.</span>
              </div>

              <div className="form-group">
                <label htmlFor="linkedin">LinkedIn URL</label>
                <input
                  id="linkedin"
                  type="url"
                  className="form-input"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="portfolio">Portfolio / Personal Site</label>
                <input
                  id="portfolio"
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resume">Resume URL</label>
                <input
                  id="resume"
                  type="url"
                  className="form-input"
                  placeholder="https://drive.google.com/... or direct link to PDF"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                />
                <span className="form-hint">Link to your resume (Google Drive, Dropbox, or direct PDF link). If we can&apos;t find one on your portfolio, we&apos;ll ask for it later.</span>
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                {submitting ? 'Analyzing your profile...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
