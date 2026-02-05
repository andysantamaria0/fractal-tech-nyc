'use client'

import { useState } from 'react'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import { useRouter } from 'next/navigation'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        width: '100%', boxSizing: 'border-box' as const,
        fontFamily: f.serif, fontSize: 15, color: c.charcoal,
        backgroundColor: c.fog, border: `1px solid ${focused ? c.honey : c.stoneLight}`,
        borderRadius: 6, padding: '12px 16px', outline: 'none',
        transition: 'border-color 200ms ease',
        ...props.style,
      }}
    />
  )
}

interface Props {
  profile: EngineerProfileSpa
}

export default function EngineerProfileView({ profile }: Props) {
  const [editing, setEditing] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || '')
  const [githubUrl, setGithubUrl] = useState(profile.github_url || '')
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolio_url || '')
  const [resumeUrl, setResumeUrl] = useState(profile.resume_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/engineer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          resume_url: resumeUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const dna = profile.engineer_dna

  return (
    <div style={{
      backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
      borderRadius: 8, padding: '28px 32px',
    }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: f.serif, fontSize: 20, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
          {profile.name}
        </h2>
        <p style={{ fontFamily: f.mono, fontSize: 12, color: c.mist, margin: 0 }}>
          {profile.email}
        </p>

        {dna && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dna.topSkills.map(skill => (
                <span key={skill} style={{
                  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em',
                  color: c.match, backgroundColor: c.honeyLight,
                  borderRadius: 4, padding: '4px 10px',
                }}>
                  {skill}
                </span>
              ))}
            </div>
            {dna.senioritySignal && (
              <p style={{ fontFamily: f.mono, fontSize: 11, color: c.graphite, margin: '10px 0 0 0' }}>
                Seniority: {dna.senioritySignal}
              </p>
            )}
            {dna.yearsOfExperience && (
              <p style={{ fontFamily: f.mono, fontSize: 11, color: c.graphite, margin: '4px 0 0 0' }}>
                Experience: {dna.yearsOfExperience}
              </p>
            )}
          </div>
        )}

        {profile.profile_summary && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${c.stoneLight}` }}>
            <h3 style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist, margin: '0 0 8px 0' }}>
              Profile Summary
            </h3>
            <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: 0, lineHeight: 1.8 }}>
              {profile.profile_summary.snapshot}
            </p>
            {profile.profile_summary.bestFitSignals.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em', color: c.mist }}>
                  Best Fit Signals:
                </span>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
                  {profile.profile_summary.bestFitSignals.map((signal, i) => (
                    <li key={i} style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, lineHeight: 1.6 }}>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${c.stoneLight}`, paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mist, margin: 0 }}>
            Links
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              type="button"
              style={{
                fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em',
                color: c.honey, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textDecoration: 'underline',
              }}
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div style={{
            fontFamily: f.mono, fontSize: 13, color: '#8B3A3A',
            backgroundColor: 'rgba(139, 58, 58, 0.08)', border: '1px solid rgba(139, 58, 58, 0.2)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {editing ? (
          <div>
            {[
              { label: 'LinkedIn', value: linkedinUrl, set: setLinkedinUrl, placeholder: 'https://linkedin.com/in/...' },
              { label: 'GitHub', value: githubUrl, set: setGithubUrl, placeholder: 'https://github.com/...' },
              { label: 'Portfolio', value: portfolioUrl, set: setPortfolioUrl, placeholder: 'https://...' },
              { label: 'Resume URL', value: resumeUrl, set: setResumeUrl, placeholder: 'https://...' },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontFamily: f.mono, fontSize: 10,
                  letterSpacing: '0.05em', color: c.charcoal, marginBottom: 6,
                }}>
                  {field.label}
                </label>
                <FocusInput
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  backgroundColor: saving ? c.mist : c.charcoal, color: c.parchment,
                  border: 'none', borderRadius: 4, padding: '12px 24px',
                  cursor: saving ? 'not-allowed' : 'pointer', transition: '150ms ease',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                type="button"
                style={{
                  fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  backgroundColor: 'transparent', color: c.graphite,
                  border: `1px solid ${c.stone}`, borderRadius: 4, padding: '12px 24px',
                  cursor: 'pointer', transition: '150ms ease',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {[
              { label: 'LinkedIn', url: profile.linkedin_url },
              { label: 'GitHub', url: profile.github_url },
              { label: 'Portfolio', url: profile.portfolio_url },
              { label: 'Resume', url: profile.resume_url },
            ].map(link => (
              <div key={link.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${c.stoneLight}`,
              }}>
                <span style={{ fontFamily: f.mono, fontSize: 11, color: c.mist }}>
                  {link.label}
                </span>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: f.mono, fontSize: 11, color: c.honey, textDecoration: 'none',
                    maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {link.url}
                  </a>
                ) : (
                  <span style={{ fontFamily: f.mono, fontSize: 11, color: c.mist, fontStyle: 'italic' }}>
                    Not set
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
