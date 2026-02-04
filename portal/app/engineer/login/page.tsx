'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EngineerLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-window">
        <div className="hero-window">
          <div className="hero-title-bar">ENGINEER LOGIN</div>
          <div className="window-content">
            {sent ? (
              <div className="engineer-magic-link-sent">
                <h1>Check your email</h1>
                <p>
                  We sent a login link to <strong>{email}</strong>.
                  Click the link in your email to sign in — no password needed.
                </p>
                <p className="engineer-magic-link-hint">
                  Don&apos;t see it? Check your spam folder, or{' '}
                  <button
                    type="button"
                    className="engineer-magic-link-resend"
                    onClick={() => { setSent(false); setLoading(false) }}
                  >
                    try again
                  </button>.
                </p>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <h1>Welcome to Fractal</h1>
                  <p>Enter your email and we&apos;ll send you a link to sign in. No password required.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <button type="submit" className="btn-primary btn-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send me a login link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
