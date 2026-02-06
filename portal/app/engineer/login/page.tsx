'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import PortalAudioPlayer from '@/components/engineer/PortalAudioPlayer'
import { ease, duration, drift } from '@/lib/engineer-animation-tokens'

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
      fontFamily: fonts.serif,
      WebkitFontSmoothing: 'antialiased',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.login, ease: ease.page }}
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 0 32px',
          textAlign: 'center',
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: drift.login }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.login, ease: ease.page, delay: 0.1 }}
          style={{
            fontFamily: fonts.mono,
            fontSize: 15,
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: colors.honey,
            margin: '0 0 16px 0',
          }}
        >
          The Fractal Hiring Spa
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: drift.login }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.login, ease: ease.page, delay: 0.2 }}
          style={{
            fontFamily: fonts.serif,
            fontSize: 'clamp(22px, 3.5vw, 28px)',
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
            color: colors.charcoal,
            margin: '0 auto 16px',
            maxWidth: 600,
          }}
        >
          Up to 10 hand-picked roles each week matching your skills, career goals, and personal priorities.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: drift.login }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.login, ease: ease.page, delay: 0.3 }}
          style={{
            fontFamily: fonts.serif,
            fontSize: 20,
            lineHeight: 1.6,
            color: '#7A9E7A',
            margin: '0 auto 12px',
            maxWidth: 560,
          }}
        >
          Bring some calm to the job journey.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: drift.login }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.login, ease: ease.page, delay: 0.35 }}
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: '0.05em',
            color: colors.mist,
            margin: 0,
          }}
        >
          Your roles refresh every Monday at noon EST
        </motion.p>
      </motion.section>

      {/* Login Card */}
      <section style={{
        maxWidth: 530,
        margin: '0 auto',
        width: '100%',
      }}>
        <motion.div
          initial={{ opacity: 0, y: drift.login }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.login, ease: ease.page, delay: 0.45 }}
          style={{
            backgroundColor: colors.fog,
            border: `1px solid ${colors.stoneLight}`,
            borderRadius: 12,
            padding: 36,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            textAlign: 'center',
          }}
        >
          <h2 style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: colors.charcoal,
            margin: '0 0 8px 0',
          }}>
            Ready to relax?
          </h2>

          <p style={{
            fontFamily: fonts.serif,
            fontSize: 15,
            lineHeight: 1.7,
            color: colors.graphite,
            margin: '0 0 24px 0',
          }}>
            Sign in with your email to get started.
          </p>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: drift.feedback }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -drift.feedback }}
                transition={{ duration: duration.feedback, ease: ease.page }}
              >
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
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: drift.feedback }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -drift.feedback }}
                transition={{ duration: duration.feedback, ease: ease.page }}
              >
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

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
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
                    {loading ? 'Sending...' : 'Get Started'}
                  </motion.button>
                </form>

                <p style={{
                  fontFamily: fonts.serif,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: colors.mist,
                  margin: '16px 0 0 0',
                }}>
                  Currently available to engineers in the Fractal Tech Accelerator.{' '}
                  <a
                    href="https://fractaltech.nyc"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: colors.honey,
                      textDecoration: 'none',
                      borderBottom: `1px solid ${colors.honeyBorder}`,
                      paddingBottom: 1,
                    }}
                  >
                    Learn more
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      <footer style={{
        textAlign: 'center',
        marginTop: 24,
      }}>
        <span style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: '0.05em',
          color: colors.mist,
        }}>
          Built by Fractal Tech NYC
        </span>
      </footer>

      <PortalAudioPlayer />
    </div>
  )
}
