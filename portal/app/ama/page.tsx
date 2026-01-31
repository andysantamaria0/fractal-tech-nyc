'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/posthog'
import Link from 'next/link'

const TAG_OPTIONS = [
  { value: 'tag-me', label: 'Tag me!' },
  { value: 'keep-anon', label: 'Keep me anon' },
]

export default function AmaPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [twitter, setTwitter] = useState('')
  const [phone, setPhone] = useState('')
  const [context, setContext] = useState('')
  const [question, setQuestion] = useState('')
  const [tagPreference, setTagPreference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Name is required'
    if (!email.trim()) errors.email = 'Email is required'
    if (!twitter.trim()) errors.twitter = 'Twitter handle is required'
    if (!phone.trim()) errors.phone = 'Phone number is required'
    if (!context.trim()) errors.context = 'Please provide some context'
    if (!question.trim()) errors.question = 'Question is required'
    if (!tagPreference) errors.tagPreference = 'Please select an option'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/ama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          twitter,
          phone,
          context,
          question,
          tag_preference: tagPreference,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      trackEvent('ama_submission_completed', {
        tag_preference: tagPreference,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="dashboard">
        <div className="container-narrow">
          <div className="window" style={{ margin: '0 auto' }}>
            <div className="window-title">Question Submitted</div>
            <div className="window-content" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
                Thanks for your question!
              </p>
              <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
                I&apos;ll do my best to get back to you. If it&apos;s a longer answer, I might give you a call.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSubmitted(false)
                    setName('')
                    setEmail('')
                    setTwitter('')
                    setPhone('')
                    setContext('')
                    setQuestion('')
                    setTagPreference('')
                  }}
                >
                  Ask Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="container-narrow">
        <div className="window" style={{ margin: '0 auto' }}>
          <div className="window-title">Ask Me Anything</div>
          <div className="window-content">
            <div style={{ marginBottom: 'var(--space-7)' }}>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                Ask me about SWE jobs in the Age of AI
              </h1>
              <p style={{ color: 'var(--color-slate)', lineHeight: 1.6 }}>
                In the last two years, I&apos;ve placed over 50 junior engineers in full-time jobs. I write about the future of tech &amp; economy on my twitter and my substack. I love talking to new people + unblocking my peers. Ask me a question about working as an engineer in the age of AI, and I&apos;ll do my best to get back to you :)
              </p>
              <p style={{ color: 'var(--color-slate)', marginTop: 'var(--space-3)', fontWeight: 700 }}>
                &mdash; Andrew
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className={`form-group ${fieldErrors.name ? 'error' : ''}`}>
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: '' })) }}
                  required
                />
                {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
              </div>

              <div className={`form-group ${fieldErrors.email ? 'error' : ''}`}>
                <label htmlFor="email">Where can I send my response? *</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })) }}
                  required
                />
                {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
              </div>

              <div className={`form-group ${fieldErrors.twitter ? 'error' : ''}`}>
                <label htmlFor="twitter">Twitter *</label>
                <input
                  id="twitter"
                  type="text"
                  className="form-input"
                  value={twitter}
                  onChange={(e) => { setTwitter(e.target.value); setFieldErrors((prev) => ({ ...prev, twitter: '' })) }}
                  required
                />
                {fieldErrors.twitter && <div className="form-error">{fieldErrors.twitter}</div>}
              </div>

              <div className={`form-group ${fieldErrors.phone ? 'error' : ''}`}>
                <label htmlFor="phone">If it&apos;s a long answer, might call you! *</label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, phone: '' })) }}
                  required
                />
                {fieldErrors.phone && <div className="form-error">{fieldErrors.phone}</div>}
              </div>

              <div className={`form-group ${fieldErrors.context ? 'error' : ''}`}>
                <label htmlFor="context">Helpful context: current job title, time on the job hunt, SWE experience *</label>
                <textarea
                  id="context"
                  className="form-input"
                  value={context}
                  onChange={(e) => { setContext(e.target.value); setFieldErrors((prev) => ({ ...prev, context: '' })) }}
                  required
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
                {fieldErrors.context && <div className="form-error">{fieldErrors.context}</div>}
              </div>

              <div className={`form-group ${fieldErrors.question ? 'error' : ''}`}>
                <label htmlFor="question">Your question *</label>
                <textarea
                  id="question"
                  className="form-input"
                  value={question}
                  onChange={(e) => { setQuestion(e.target.value); setFieldErrors((prev) => ({ ...prev, question: '' })) }}
                  required
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
                {fieldErrors.question && <div className="form-error">{fieldErrors.question}</div>}
              </div>

              <div className={`form-group ${fieldErrors.tagPreference ? 'error' : ''}`}>
                <label>Thanks for your question! If it&apos;s relevant to a lot of my audience I might tweet it publicly. If I do, can I tag you in the response? *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                  {TAG_OPTIONS.map((opt) => (
                    <label key={opt.value} className="form-checkbox">
                      <input
                        type="radio"
                        name="tagPreference"
                        value={opt.value}
                        checked={tagPreference === opt.value}
                        onChange={() => { setTagPreference(opt.value); setFieldErrors((prev) => ({ ...prev, tagPreference: '' })) }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.tagPreference && <div className="form-error">{fieldErrors.tagPreference}</div>}
              </div>

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
