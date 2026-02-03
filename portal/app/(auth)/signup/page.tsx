'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/posthog'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    trackEvent('signup_started')
  }, [])

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackEvent('signup_form_submitted', { page: 'signup' })

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

    // If session exists, email confirmation is disabled — redirect to profile completion
    if (data.session) {
      router.push('/complete-profile')
      return
    }

    // Email confirmation is enabled — show confirmation message
    setConfirmationSent(true)
    setLoading(false)
  }

  async function handleGoogleSignup() {
    trackEvent('google_oauth_clicked', { page: 'signup' })
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
        <div className="auth-window">
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
      <div className="auth-window">
        <div className="hero-window">
          <div className="hero-title-bar">SIGN UP</div>
          <div className="window-content">
            <div className="auth-header">
              <h1>Join Fractal Partners</h1>
              <p>Get access to cohort updates, engineer profiles, and more</p>
            </div>

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
                {loading ? 'Creating account...' : 'Sign Up'}
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
