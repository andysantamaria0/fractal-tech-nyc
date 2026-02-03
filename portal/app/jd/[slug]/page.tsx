'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import BeautifiedJDView from '@/components/hiring-spa/BeautifiedJDView'
import EmailGate from '@/components/hiring-spa/EmailGate'
import ChallengeSubmissionForm from '@/components/hiring-spa/ChallengeSubmissionForm'
import type { MatchData, ChallengeData } from '@/components/hiring-spa/EmailGate'
import type { BeautifiedJD } from '@/lib/hiring-spa/types'

interface RoleMeta {
  title: string
  company_name: string
  slug: string
}

export default function PublicJDPage() {
  const params = useParams()
  const slug = params.slug as string

  const [meta, setMeta] = useState<RoleMeta | null>(null)
  const [jd, setJD] = useState<BeautifiedJD | null>(null)
  const [roleTitle, setRoleTitle] = useState('')
  const [match, setMatch] = useState<MatchData | null>(null)
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [challengeResponse, setChallengeResponse] = useState<string | null>(null)
  const [challengeSubmission, setChallengeSubmission] = useState<MatchData['challenge_submission']>(null)
  const [challengeSubmitting, setChallengeSubmitting] = useState(false)
  const [consentDecision, setConsentDecision] = useState<string | null>(null)
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  const [viewerEmail, setViewerEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/jd/${slug}`)
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setMeta(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchMeta()
  }, [slug])

  const handleUnlock = useCallback((beautifiedJD: BeautifiedJD, title: string, matchData: MatchData | null, challengeData: ChallengeData | null, email: string) => {
    setJD(beautifiedJD)
    setRoleTitle(title)
    setMatch(matchData)
    setChallenge(challengeData)
    setViewerEmail(email)
    if (matchData?.challenge_response) {
      setChallengeResponse(matchData.challenge_response)
    }
    if (matchData?.challenge_submission) {
      setChallengeSubmission(matchData.challenge_submission)
    }
    if (matchData?.engineer_decision) {
      setConsentDecision(matchData.engineer_decision)
    }
  }, [])

  const handleConsentResponse = useCallback(async (decision: 'interested' | 'not_interested') => {
    setConsentSubmitting(true)
    try {
      const res = await fetch('/api/jd/engineer-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email: viewerEmail, decision }),
      })
      if (res.ok) {
        setConsentDecision(decision)
      }
    } catch {
      // silently fail
    } finally {
      setConsentSubmitting(false)
    }
  }, [slug, viewerEmail])

  const handleChallengeResponse = useCallback(async (response: 'accepted' | 'declined') => {
    setChallengeSubmitting(true)
    try {
      const res = await fetch('/api/jd/challenge-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email: viewerEmail, response }),
      })
      if (res.ok) {
        setChallengeResponse(response)
      }
    } catch {
      // silently fail
    } finally {
      setChallengeSubmitting(false)
    }
  }, [slug, viewerEmail])

  if (loading) {
    return (
      <div className="jd-public-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p className="spa-body-muted">Loading...</p>
      </div>
    )
  }

  if (notFound || !meta) {
    return (
      <div className="jd-public-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h1 className="spa-heading-1" style={{ marginBottom: 8 }}>Role Not Found</h1>
        <p className="spa-body-muted">This job description may have been removed or is no longer active.</p>
      </div>
    )
  }

  return (
    <div className="jd-public-page">
      {/* Header */}
      <div className="jd-public-header">
        {meta.company_name && (
          <p className="jd-public-company">{meta.company_name}</p>
        )}
        <h1 className="jd-public-title">{roleTitle || meta.title}</h1>
      </div>

      {/* Email gate or beautified JD */}
      {!jd ? (
        <EmailGate
          slug={slug}
          title={meta.title}
          companyName={meta.company_name}
          onUnlock={handleUnlock}
        />
      ) : (
        <>
          {/* Match percentage banner */}
          {match && (
            <div className="jd-match-banner">
              <span className="jd-match-banner-score">{match.overall_score}%</span>
              <span className="jd-match-banner-text">match for this role</span>
            </div>
          )}

          {/* Consent card — shown when engineer was notified but hasn't decided */}
          {match && match.engineer_notified_at && !consentDecision && (
            <div className="jd-challenge-card">
              <p className="spa-label-emphasis" style={{ marginBottom: 12 }}>This company is interested in you</p>
              <p className="spa-body" style={{ marginBottom: 16 }}>Would you like to be introduced?</p>
              <div className="jd-challenge-actions">
                <button
                  className="spa-btn spa-btn-primary"
                  onClick={() => handleConsentResponse('interested')}
                  disabled={consentSubmitting}
                >
                  {consentSubmitting ? 'Submitting...' : "I'm Interested"}
                </button>
                <button
                  className="spa-btn spa-btn-secondary"
                  onClick={() => handleConsentResponse('not_interested')}
                  disabled={consentSubmitting}
                >
                  Not for Me
                </button>
              </div>
            </div>
          )}

          {/* Consent response confirmation */}
          {consentDecision && (
            <div className="jd-challenge-confirmation">
              <p className="spa-body">
                {consentDecision === 'interested'
                  ? "Great! We'll facilitate an introduction."
                  : 'No worries — thanks for considering.'}
              </p>
            </div>
          )}

          <BeautifiedJDView jd={jd} />

          {/* Challenge card */}
          {challenge && match && !challengeResponse && (
            <div className="jd-challenge-card">
              <p className="spa-label-emphasis" style={{ marginBottom: 12 }}>Challenge</p>
              {challenge.prompt && (
                <p className="jd-challenge-prompt">{challenge.prompt}</p>
              )}
              <div className="jd-challenge-actions">
                <button
                  className="spa-btn spa-btn-primary"
                  onClick={() => handleChallengeResponse('accepted')}
                  disabled={challengeSubmitting}
                >
                  {challengeSubmitting ? 'Submitting...' : 'Accept Challenge'}
                </button>
                <button
                  className="spa-btn spa-btn-secondary"
                  onClick={() => handleChallengeResponse('declined')}
                  disabled={challengeSubmitting}
                >
                  Not Right Now
                </button>
              </div>
            </div>
          )}

          {/* Challenge response: accepted + no submission → show form */}
          {challengeResponse === 'accepted' && !challengeSubmission && challenge?.prompt && (
            <ChallengeSubmissionForm
              slug={slug}
              email={viewerEmail}
              challengePrompt={challenge.prompt}
              onSubmitted={(sub) => {
                setChallengeSubmission({
                  id: sub.id,
                  submitted_at: sub.submitted_at,
                  auto_score: null,
                  auto_reasoning: null,
                  human_score: null,
                  human_feedback: null,
                  reviewer_name: null,
                  reviewer_linkedin_url: null,
                  final_score: null,
                })
              }}
            />
          )}

          {/* Challenge response: accepted + has submission → show status */}
          {challengeResponse === 'accepted' && challengeSubmission && (
            <div className="jd-challenge-confirmation">
              <p className="spa-label-emphasis" style={{ marginBottom: 8 }}>Submission Received</p>
              <p className="spa-body-small" style={{ marginBottom: 12 }}>
                Submitted {new Date(challengeSubmission.submitted_at).toLocaleDateString()}
              </p>

              {challengeSubmission.auto_score !== null && (
                <div className="jd-challenge-score" style={{ marginBottom: 12 }}>
                  <p className="jd-challenge-auto-label">Auto-Grade</p>
                  <p className="spa-heading-3" style={{ fontFamily: 'var(--spa-font-mono)', fontSize: 16 }}>
                    {challengeSubmission.auto_score}/100
                  </p>
                  {challengeSubmission.auto_reasoning && (
                    <p className="spa-body-small" style={{ marginTop: 4 }}>
                      {challengeSubmission.auto_reasoning}
                    </p>
                  )}
                </div>
              )}

              {challengeSubmission.human_score !== null && (
                <div className="jd-challenge-score jd-challenge-reviewer" style={{ marginBottom: 12 }}>
                  <p className="jd-challenge-auto-label">Engineering Leader Review</p>
                  <p className="spa-heading-3" style={{ fontFamily: 'var(--spa-font-mono)', fontSize: 16 }}>
                    {challengeSubmission.human_score}/100
                  </p>
                  {challengeSubmission.reviewer_name && (
                    <p className="spa-body-small" style={{ marginTop: 4 }}>
                      Reviewed by{' '}
                      {challengeSubmission.reviewer_linkedin_url ? (
                        <a
                          href={challengeSubmission.reviewer_linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--spa-honey)', textDecoration: 'none', borderBottom: '1px solid var(--spa-honey-border)' }}
                        >
                          {challengeSubmission.reviewer_name}
                        </a>
                      ) : (
                        challengeSubmission.reviewer_name
                      )}
                    </p>
                  )}
                  {challengeSubmission.human_feedback && (
                    <p className="spa-body-small" style={{ marginTop: 4 }}>
                      {challengeSubmission.human_feedback}
                    </p>
                  )}
                </div>
              )}

              {challengeSubmission.final_score !== null && challengeSubmission.human_score !== null && (
                <div className="jd-challenge-score">
                  <p className="jd-challenge-auto-label">Final Score</p>
                  <p className="spa-heading-3" style={{ fontFamily: 'var(--spa-font-mono)', fontSize: 18 }}>
                    {challengeSubmission.final_score}/100
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Challenge response: declined */}
          {challengeResponse === 'declined' && (
            <div className="jd-challenge-confirmation">
              <p className="spa-body">
                No worries — thanks for checking out the role.
              </p>
            </div>
          )}

          {/* Join the match pool CTA — only shown when viewer has no match */}
          {!match && (
            <p className="jd-public-join-pool">
              Want to get matched with more roles?{' '}
              <a href="/engineer/apply">Join the match pool</a>
            </p>
          )}

          <p className="jd-public-powered">Powered by Fractal Hiring Spa</p>
        </>
      )}
    </div>
  )
}
