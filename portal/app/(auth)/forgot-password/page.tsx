'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/update-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-window">
          <div className="hero-window">
            <div className="hero-title-bar">CHECK YOUR EMAIL</div>
            <div className="window-content">
              <div className="auth-header">
                <h1>Email Sent</h1>
                <p>
                  We sent a password reset link to <strong>{email}</strong>.
                  Check your inbox and click the link to reset your password.
                </p>
              </div>
              <div className="auth-footer">
                <Link href="/login">Back to login</Link>
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
          <div className="hero-title-bar">RESET PASSWORD</div>
          <div className="window-content">
            <div className="auth-header">
              <h1>Forgot Password?</h1>
              <p>Enter your email and we&apos;ll send you a reset link</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
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

              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-footer">
              Remember your password? <Link href="/login">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
