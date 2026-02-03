'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/posthog'

export default function EarlyAccessPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    trackEvent('early_access_signup_started')
  }, [])

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackEvent('signup_form_submitted', { page: 'early-access' })

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/complete-profile')
      return
    }

    setConfirmationSent(true)
    setLoading(false)
  }

  async function handleGoogleSignup() {
    trackEvent('google_oauth_clicked', { page: 'early-access' })
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="auth-page">
        <div className="auth-window early-access-window">
          <div className="hero-window">
            <div className="hero-title-bar">CHECK YOUR EMAIL</div>
            <div className="window-content">
              <div className="auth-header">
                <h1>Confirm Your Email</h1>
                <p>
                  We sent a confirmation link to <strong>{email}</strong>.
                  Click the link in your email to continue setting up your account.
                </p>
              </div>
              <div className="auth-footer">
                <Link href="/login">Back to Log In</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-window early-access-window">
        <div className="hero-window">
          <div className="hero-title-bar">YOU&apos;RE INVITED</div>
          <div className="window-content">
            <div className="early-access-invitation">
              <div className="section-label">EARLY ACCESS</div>
              <h1>You have a front-row seat.</h1>
              <p>
                Andy is personally inviting a small group of companies to
                early access before the portal opens to everyone.
              </p>
            </div>

            <div className="early-access-perks">
              <div className="early-access-perk">
                <strong>Spring 2026 Cohort</strong>
                <span>First to browse and get matched</span>
              </div>
              <div className="early-access-perk">
                <strong>Fractal Cycles</strong>
                <span>Up to 40 free hours of engineering</span>
              </div>
              <div className="early-access-perk">
                <strong>Direct Line to Andy</strong>
                <span>Priority support and feedback channel</span>
              </div>
            </div>

            <div className="early-access-note">
              <p>
                &ldquo;We built this portal so partners can see exactly what our
                engineers are shipping in real time. You&apos;re getting access
                before anyone else&nbsp;&mdash; I&apos;d love your feedback.&rdquo;
              </p>
              <span>&mdash; Andy, Fractal</span>
            </div>

            <div className="auth-divider">CREATE YOUR ACCOUNT</div>

            {error && <div className="alert alert-error">{error}</div>}

            <button onClick={handleGoogleSignup} className="google-btn" type="button" disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>

            <div className="auth-divider">or</div>

            <form onSubmit={handleEmailSignup}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Claim Your Spot'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link href="/login">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
