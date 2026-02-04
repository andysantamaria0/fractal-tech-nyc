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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadEngineer() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if already has profile
      const res = await fetch('/api/engineer/me')
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          router.push('/engineer/dashboard')
          return
        }
      }

      // Load from engineers table
      const { data: eng } = await supabase
        .from('engineers')
        .select('id, name, email, github_url, linkedin_url, portfolio_url')
        .eq('email', user.email!)
        .single()

      if (eng) {
        setEngineer(eng)
        setName(eng.name)
        setLinkedinUrl(eng.linkedin_url || '')
        setGithubUrl(eng.github_url || '')
        setPortfolioUrl(eng.portfolio_url || '')
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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create profile')
      }

      router.push('/engineer/dashboard')
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
    <div className="auth-page">
      <div className="auth-window">
        <div className="hero-window">
          <div className="hero-title-bar">ENGINEER ONBOARDING</div>
          <div className="window-content">
            <div className="auth-header">
              <h1>Welcome to Fractal</h1>
              <p>Let&apos;s set up your engineer profile to find your best job matches.</p>
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
                <label htmlFor="github">GitHub URL</label>
                <input
                  id="github"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="portfolio">Portfolio URL</label>
                <input
                  id="portfolio"
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                {submitting ? 'Setting up...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
