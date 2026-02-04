'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const colors = {
  platinum: '#E8E4DF',
  fog: '#F7F5F2',
  parchment: '#FAF8F5',
  honey: '#C9A86C',
  stone: '#A69B8D',
  charcoal: '#2C2C2C',
  graphite: '#5C5C5C',
  mist: '#9C9C9C',
  stoneLight: 'rgba(166, 155, 141, 0.12)',
  honeyBorder: 'rgba(201, 168, 108, 0.30)',
}

const fonts = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", Monaco, Inconsolata, "Fira Code", monospace',
}

export default function EngineerLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.platinum,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.serif,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        backgroundColor: colors.fog,
        border: `1px solid ${colors.stoneLight}`,
        borderRadius: 12,
        padding: 48,
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          color: colors.charcoal,
          margin: 0,
          marginBottom: 8,
        }}>
          Welcome to the Fractal Hiring Spa.
        </h1>

        <p style={{
          fontFamily: fonts.serif,
          fontSize: 15,
          lineHeight: 1.8,
          color: colors.graphite,
          margin: 0,
          marginBottom: 32,
        }}>
          Relaxing sessions every Monday starting at Noon EST.
        </p>

        <hr style={{
          border: 'none',
          borderTop: `1px solid ${colors.stoneLight}`,
          margin: '0 0 32px 0',
        }} />

        {sent ? (
          <div>
            <p style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: colors.honey,
              margin: '0 0 16px 0',
            }}>
              Check your email
            </p>
            <p style={{
              fontFamily: fonts.serif,
              fontSize: 15,
              lineHeight: 1.8,
              color: colors.charcoal,
              margin: '0 0 16px 0',
            }}>
              We sent a login link to <strong>{email}</strong>.
              Click the link in your email to sign in — no password needed.
            </p>
            <p style={{
              fontFamily: fonts.serif,
              fontSize: 14,
              lineHeight: 1.7,
              color: colors.graphite,
              margin: 0,
            }}>
              Don&apos;t see it? Check your spam folder, or{' '}
              <button
                type="button"
                onClick={() => { setSent(false); setLoading(false) }}
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 14,
                  color: colors.graphite,
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <p style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: '#c0392b',
                marginBottom: 12,
              }}>
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: colors.graphite,
                    marginBottom: 8,
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    fontFamily: fonts.serif,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: colors.charcoal,
                    backgroundColor: colors.fog,
                    border: `1px solid ${focused ? colors.honeyBorder : colors.stoneLight}`,
                    borderRadius: 4,
                    padding: 16,
                    outline: 'none',
                    transition: '150ms ease',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  backgroundColor: colors.charcoal,
                  color: colors.parchment,
                  border: 'none',
                  borderRadius: 4,
                  padding: '14px 28px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: '150ms ease',
                }}
              >
                {loading ? 'Sending...' : 'Sign in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
