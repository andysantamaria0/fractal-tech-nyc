'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'
import { ease, duration, drift, stagger } from '@/lib/engineer-animation-tokens'

interface EngineerData {
  id: string
  name: string
  email: string
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  resume_url: string | null
}

function FocusInput({ id, type = 'text', value, onChange, placeholder, required = false }: {
  id: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', fontFamily: f.serif, fontSize: 14, lineHeight: 1.7,
        color: c.charcoal, backgroundColor: c.fog,
        border: `1px solid ${focused ? c.honeyBorder : c.stoneLight}`,
        borderRadius: 4, padding: 16, outline: 'none', transition: '150ms ease',
        boxSizing: 'border-box' as const,
      }}
    />
  )
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

      const res = await fetch('/api/engineer/me')
      if (res.ok) {
        const data = await res.json()
        if (data.profile && data.profile.status !== 'draft') {
          router.push('/engineer/dashboard')
          return
        }
      }

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

  const label: React.CSSProperties = {
    display: 'block', fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: c.graphite, marginBottom: 8,
  }
  const hint: React.CSSProperties = {
    fontFamily: f.serif, fontSize: 13, color: c.mist, marginTop: 6,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: c.platinum, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite }}>Loading your information...</p>
      </div>
    )
  }

  const steps = [
    { num: 1, title: 'Share your links', desc: "We'll analyze your GitHub, portfolio, and LinkedIn to build your technical profile.", active: true },
    { num: 2, title: 'Quick questionnaire', desc: "Tell us what you're looking for in your next role (5 min).", active: false },
    { num: 3, title: 'Get matched', desc: 'We score hundreds of jobs against your profile and show your top 10.', active: false },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: c.platinum, fontFamily: f.serif, WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 48 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: f.serif, fontSize: 28, fontWeight: 400, lineHeight: 1.3,
            letterSpacing: '-0.01em', color: c.charcoal, margin: '0 0 8px 0',
          }}>
            Welcome to Fractal
          </h1>
          <p style={{ fontFamily: f.serif, fontSize: 15, lineHeight: 1.8, color: c.graphite, margin: 0 }}>
            We&apos;ll match you with your best-fit jobs in 3 steps.
          </p>
        </div>

        {/* Steps */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: stagger.steps, delayChildren: 0.3 } },
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}
        >
          {steps.map(step => (
            <motion.div
              key={step.num}
              variants={{
                hidden: { opacity: 0, y: drift.item },
                visible: { opacity: step.active ? 1 : 0.7, y: 0, transition: { duration: duration.page, ease: ease.page } },
              }}
              style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                backgroundColor: step.active ? c.parchment : c.fog,
                border: `1px solid ${step.active ? c.honeyBorder : c.stoneLight}`,
                borderRadius: 8, padding: '16px 20px',
              }}
            >
              <span style={{
                fontFamily: f.mono, fontSize: 11, fontWeight: 500, color: step.active ? c.honey : c.mist,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: `1.5px solid ${step.active ? c.honey : c.mist}`, flexShrink: 0,
              }}>
                {step.num}
              </span>
              <div>
                <div style={{ fontFamily: f.serif, fontSize: 15, fontWeight: 500, color: c.charcoal, marginBottom: 2 }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: f.serif, fontSize: 13, color: c.graphite, lineHeight: 1.6 }}>
                  {step.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', backgroundColor: 'rgba(200, 50, 50, 0.08)',
            border: '1px solid rgba(200, 50, 50, 0.2)', borderRadius: 6,
            fontFamily: f.mono, fontSize: 11, color: '#8B3030', marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{
          backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
          borderRadius: 8, padding: 32,
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="name" style={label}>Name</label>
              <FocusInput id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="github" style={label}>GitHub URL</label>
              <FocusInput id="github" type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
              <p style={hint}>We&apos;ll analyze your repos to understand your technical strengths.</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="linkedin" style={label}>LinkedIn URL</label>
              <FocusInput id="linkedin" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="portfolio" style={label}>Portfolio / Personal Site</label>
              <FocusInput id="portfolio" type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label htmlFor="resume" style={label}>Resume URL</label>
              <FocusInput id="resume" type="url" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/... or direct link to PDF" />
              <p style={hint}>Link to your resume (Google Drive, Dropbox, or direct PDF link).</p>
            </div>

            <motion.button type="submit" disabled={submitting} whileTap={{ scale: 0.98 }} style={{
              width: '100%', fontFamily: f.mono, fontSize: 11, fontWeight: 400,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              backgroundColor: c.charcoal, color: c.parchment, border: 'none',
              borderRadius: 4, padding: '14px 28px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1, transition: '150ms ease',
            }}>
              {submitting ? 'Analyzing your profile...' : 'Continue'}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
