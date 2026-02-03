'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ENGINEER_SECTIONS,
  resolveEngineerPrefill,
} from '@/lib/hiring-spa/engineer-questions'
import type {
  EngineerDNA,
  WorkPreferencesAnswers,
  CareerGrowthAnswers,
  StrengthsAnswers,
  GrowthAreasAnswers,
  DealBreakersAnswers,
} from '@/lib/hiring-spa/types'

type Step = 'info' | 'crawling' | 'questionnaire' | 'confirmation'

interface ProfileState {
  id: string
  status: string
  engineer_dna: EngineerDNA | null
  work_preferences?: WorkPreferencesAnswers | null
  career_growth?: CareerGrowthAnswers | null
  strengths?: StrengthsAnswers | null
  growth_areas?: GrowthAreasAnswers | null
  deal_breakers?: DealBreakersAnswers | null
}

function statusToStep(status: string, hasUrls: boolean): Step {
  switch (status) {
    case 'crawling':
      return 'crawling'
    case 'questionnaire':
      return 'questionnaire'
    case 'complete':
      return 'confirmation'
    case 'draft':
      // If draft and no URLs, we'll move to questionnaire after submit
      return hasUrls ? 'crawling' : 'info'
    default:
      return 'info'
  }
}

const STEP_NUMBERS: Record<Step, number> = {
  info: 1,
  crawling: 2,
  questionnaire: 3,
  confirmation: 4,
}

const LOCAL_STORAGE_KEY = 'engineer-apply-email'

export default function EngineerApplyPage() {
  const [step, setStep] = useState<Step>('info')
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeChecked, setResumeChecked] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')

  // Questionnaire answers (keyed by question id)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resume check on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
      checkExistingProfile(savedEmail)
    } else {
      setResumeChecked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkExistingProfile(emailToCheck: string) {
    try {
      const res = await fetch(
        `/api/engineer/apply?email=${encodeURIComponent(emailToCheck)}`,
      )
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
        const nextStep = statusToStep(data.profile.status, false)
        setStep(nextStep)

        // Prefill answers from existing data
        if (data.profile.work_preferences || data.profile.career_growth ||
            data.profile.strengths || data.profile.growth_areas || data.profile.deal_breakers) {
          prefillFromExistingAnswers(data.profile)
        }

        // If crawling, start polling
        if (data.profile.status === 'crawling') {
          startPolling(emailToCheck)
        }
      }
    } catch {
      // Silently fail resume check
    } finally {
      setResumeChecked(true)
    }
  }

  function prefillFromExistingAnswers(p: ProfileState) {
    const filled: Record<string, string> = {}
    for (const section of ENGINEER_SECTIONS) {
      const sectionAnswers = p[section.answersKey as keyof ProfileState] as Record<string, string> | null | undefined
      if (sectionAnswers) {
        for (const q of section.questions) {
          if (sectionAnswers[q.id]) {
            filled[q.id] = sectionAnswers[q.id]
          }
        }
      }
    }
    setAnswers(filled)
  }

  const startPolling = useCallback((emailToCheck: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/engineer/apply?email=${encodeURIComponent(emailToCheck)}`,
        )
        const data = await res.json()
        if (data.profile && data.profile.status !== 'crawling') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          setProfile(data.profile)
          setStep(statusToStep(data.profile.status, false))
        }
      } catch {
        // Keep polling on failure
      }
    }, 3000)
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/engineer/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          github_url: githubUrl.trim() || undefined,
          linkedin_url: linkedinUrl.trim() || undefined,
          portfolio_url: portfolioUrl.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, email.trim().toLowerCase())
      setProfile(data.profile)

      if (data.profile.status === 'complete') {
        setStep('confirmation')
      } else if (data.profile.status === 'questionnaire') {
        setStep('questionnaire')
        // Prefill from DNA if available
        prefillFromDna(data.profile.engineer_dna)
      } else if (data.profile.status === 'crawling') {
        setStep('crawling')
        startPolling(email.trim().toLowerCase())
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function prefillFromDna(dna: EngineerDNA | null) {
    if (!dna) return
    const prefilled: Record<string, string> = {}
    for (const section of ENGINEER_SECTIONS) {
      for (const q of section.questions) {
        if (q.prefillFrom) {
          const val = resolveEngineerPrefill(q.prefillFrom, dna)
          if (val) prefilled[q.id] = val
        }
      }
    }
    setAnswers((prev) => ({ ...prefilled, ...prev }))
  }

  // When transitioning to questionnaire step, prefill from DNA
  useEffect(() => {
    if (step === 'questionnaire' && profile?.engineer_dna) {
      prefillFromDna(profile.engineer_dna)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function handleQuestionnaireSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Build section answers from flat answers map
    const work_preferences: WorkPreferencesAnswers = {}
    const career_growth: CareerGrowthAnswers = {}
    const strengths: StrengthsAnswers = {}
    const growth_areas: GrowthAreasAnswers = {}
    const deal_breakers: DealBreakersAnswers = {}

    for (const section of ENGINEER_SECTIONS) {
      for (const q of section.questions) {
        const val = answers[q.id]?.trim()
        if (!val) continue
        switch (section.answersKey) {
          case 'work_preferences':
            ;(work_preferences as Record<string, string>)[q.id] = val
            break
          case 'career_growth':
            ;(career_growth as Record<string, string>)[q.id] = val
            break
          case 'strengths':
            ;(strengths as Record<string, string>)[q.id] = val
            break
          case 'growth_areas':
            ;(growth_areas as Record<string, string>)[q.id] = val
            break
          case 'deal_breakers':
            ;(deal_breakers as Record<string, string>)[q.id] = val
            break
        }
      }
    }

    try {
      const res = await fetch('/api/engineer/apply/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          work_preferences,
          career_growth,
          strengths,
          growth_areas,
          deal_breakers,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setStep('confirmation')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!resumeChecked) {
    return (
      <div className="engineer-apply-page">
        <div className="engineer-apply-spinner">
          <div className="engineer-apply-spinner-ring" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="engineer-apply-page">
      <div className="engineer-apply-header">
        <h1>Join the Match Pool</h1>
        <p>Tell us about yourself and get matched with companies that fit.</p>
      </div>

      {step !== 'confirmation' && (
        <div className="engineer-apply-progress">
          Step {STEP_NUMBERS[step]} of 4
        </div>
      )}

      {error && (
        <div style={{
          padding: 'var(--spa-space-3) var(--spa-space-4)',
          backgroundColor: 'rgba(200, 50, 50, 0.08)',
          border: '1px solid rgba(200, 50, 50, 0.2)',
          borderRadius: 'var(--spa-radius)',
          color: '#8B3030',
          fontFamily: 'var(--spa-font-serif)',
          fontSize: '14px',
          marginBottom: 'var(--spa-space-5)',
        }}>
          {error}
        </div>
      )}

      {step === 'info' && (
        <div className="engineer-apply-step">
          <form onSubmit={handleInfoSubmit}>
            <div className="engineer-apply-field">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="engineer-apply-field">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="engineer-apply-field">
              <label htmlFor="github">GitHub URL</label>
              <input
                id="github"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="engineer-apply-field">
              <label htmlFor="linkedin">LinkedIn URL</label>
              <input
                id="linkedin"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="engineer-apply-field">
              <label htmlFor="portfolio">Portfolio / Blog URL</label>
              <input
                id="portfolio"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>

            <button
              type="submit"
              className="engineer-apply-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Continue'}
            </button>
          </form>
        </div>
      )}

      {step === 'crawling' && (
        <div className="engineer-apply-step">
          <div className="engineer-apply-spinner">
            <div className="engineer-apply-spinner-ring" />
            <p>Analyzing your profile...</p>
            <p style={{ fontSize: '13px', color: 'var(--spa-mist)' }}>
              We&apos;re looking at your GitHub and portfolio to pre-fill your questionnaire.
            </p>
          </div>
        </div>
      )}

      {step === 'questionnaire' && (
        <div className="engineer-apply-step">
          <form onSubmit={handleQuestionnaireSubmit}>
            {ENGINEER_SECTIONS.map((section) => (
              <div key={section.id} className="engineer-apply-section">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                {section.questions.map((q) => (
                  <div key={q.id} className="engineer-apply-question">
                    <label htmlFor={q.id}>{q.question}</label>
                    <textarea
                      id={q.id}
                      value={answers[q.id] || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Type your answer..."
                    />
                  </div>
                ))}
              </div>
            ))}

            {submitting ? (
              <div className="engineer-apply-spinner">
                <div className="engineer-apply-spinner-ring" />
                <p>Generating your profile...</p>
              </div>
            ) : (
              <button
                type="submit"
                className="engineer-apply-btn"
                disabled={submitting}
              >
                Submit
              </button>
            )}
          </form>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="engineer-apply-confirmation">
          <h2>You&apos;re in the match pool</h2>
          <p>
            Your profile is complete. When companies post roles through Fractal,
            we&apos;ll compute match scores based on your profile.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--spa-mist)', marginTop: '12px' }}>
            We&apos;ll notify you by email when you&apos;re matched with a company.
            No need to check back — we&apos;ll come to you.
          </p>
        </div>
      )}

      <div className="jd-public-powered">
        Powered by Fractal
      </div>
    </div>
  )
}
