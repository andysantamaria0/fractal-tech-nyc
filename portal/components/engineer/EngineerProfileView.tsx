'use client'

import { useState } from 'react'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import { useRouter } from 'next/navigation'

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
    <div className="engineer-profile-card">
      <div className="engineer-profile-info">
        <h2>{profile.name}</h2>
        <p className="engineer-profile-email">{profile.email}</p>

        {dna && (
          <div className="engineer-dna-summary">
            <div className="engineer-tag-list">
              {dna.topSkills.map(skill => (
                <span key={skill} className="engineer-tag">{skill}</span>
              ))}
            </div>
            {dna.senioritySignal && (
              <p className="engineer-dna-detail">Seniority: {dna.senioritySignal}</p>
            )}
            {dna.yearsOfExperience && (
              <p className="engineer-dna-detail">Experience: {dna.yearsOfExperience}</p>
            )}
          </div>
        )}

        {profile.profile_summary && (
          <div className="engineer-summary-section">
            <h3>Profile Summary</h3>
            <p>{profile.profile_summary.snapshot}</p>
            {profile.profile_summary.bestFitSignals.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Best Fit Signals:</strong>
                <ul>
                  {profile.profile_summary.bestFitSignals.map((signal, i) => (
                    <li key={i}>{signal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="engineer-profile-links">
        <h3>Links {!editing && (
          <button onClick={() => setEditing(true)} className="engineer-edit-btn" type="button">Edit</button>
        )}</h3>

        {error && <div className="alert alert-error">{error}</div>}

        {editing ? (
          <div className="engineer-edit-form">
            <div className="form-group">
              <label>LinkedIn</label>
              <input className="form-input" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="form-group">
              <label>GitHub</label>
              <input className="form-input" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="form-group">
              <label>Portfolio</label>
              <input className="form-input" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Resume URL</label>
              <input className="form-input" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary" type="button">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="engineer-links-list">
            <LinkRow label="LinkedIn" url={profile.linkedin_url} />
            <LinkRow label="GitHub" url={profile.github_url} />
            <LinkRow label="Portfolio" url={profile.portfolio_url} />
            <LinkRow label="Resume" url={profile.resume_url} />
          </div>
        )}
      </div>
    </div>
  )
}

function LinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="engineer-link-row">
      <span className="engineer-link-label">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="engineer-link-value">{url}</a>
      ) : (
        <span className="engineer-link-missing">Not set</span>
      )}
    </div>
  )
}
