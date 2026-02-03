'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedJD } from '@/lib/hiring-spa/types'

interface BatchPreviewItem {
  extracted: ExtractedJD
  roleId: string
}

export default function RoleSubmissionForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedJD | null>(null)
  const [roleId, setRoleId] = useState<string | null>(null)
  const [batchPreviews, setBatchPreviews] = useState<BatchPreviewItem[]>([])
  const [beautifying, setBeautifying] = useState(false)
  const [challengeEnabled, setChallengeEnabled] = useState(false)
  const [challengePrompt, setChallengePrompt] = useState('')
  const [error, setError] = useState('')

  const parseUrls = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }, [])

  const handleExtract = useCallback(async () => {
    setError('')
    setExtracting(true)
    try {
      if (mode === 'url') {
        const urls = parseUrls(urlInput)
        if (urls.length > 1) {
          // Batch URL mode
          const res = await fetch('/api/hiring-spa/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Failed to extract')
            return
          }
          const previews: BatchPreviewItem[] = data.roles.map((role: { id: string }, i: number) => ({
            extracted: data.extracted[i],
            roleId: role.id,
          }))
          setBatchPreviews(previews)
          return
        }
        // Single URL
        const res = await fetch('/api/hiring-spa/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urls[0] }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to extract')
          return
        }
        setExtracted(data.extracted)
        setRoleId(data.role.id)
      } else {
        const res = await fetch('/api/hiring-spa/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || 'Untitled Role', raw_text: rawText }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to extract')
          return
        }
        setExtracted(data.extracted)
        setRoleId(data.role.id)
      }
    } catch {
      setError('Network error')
    } finally {
      setExtracting(false)
    }
  }, [mode, urlInput, title, rawText, parseUrls])

  const saveChallengeData = useCallback(async () => {
    if (!roleId) return
    if (!challengeEnabled && !challengePrompt) return
    await fetch(`/api/hiring-spa/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_enabled: challengeEnabled,
        challenge_prompt: challengePrompt || null,
      }),
    })
  }, [roleId, challengeEnabled, challengePrompt])

  const handleBeautify = useCallback(async () => {
    if (!roleId) return
    setError('')
    setBeautifying(true)
    try {
      await saveChallengeData()
      const res = await fetch('/api/hiring-spa/roles/beautify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to beautify')
        return
      }

      router.push(`/hiring-spa/roles/${roleId}`)
    } catch {
      setError('Network error')
    } finally {
      setBeautifying(false)
    }
  }, [roleId, router, saveChallengeData])

  const handleBatchBeautify = useCallback(async () => {
    if (batchPreviews.length === 0) return
    setError('')
    setBeautifying(true)
    try {
      const roleIds = batchPreviews.map(p => p.roleId)
      const res = await fetch('/api/hiring-spa/roles/beautify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: roleIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to beautify')
        return
      }
      router.push('/hiring-spa/roles')
    } catch {
      setError('Network error')
    } finally {
      setBeautifying(false)
    }
  }, [batchPreviews, router])

  const handleSkipToDraft = useCallback(async () => {
    if (!roleId) return
    await saveChallengeData()
    router.push(`/hiring-spa/roles/${roleId}`)
  }, [roleId, router, saveChallengeData])

  // Batch preview
  if (batchPreviews.length > 0) {
    return (
      <div>
        <p className="spa-label-emphasis" style={{ marginBottom: 16 }}>
          {batchPreviews.length} Roles Extracted
        </p>
        {batchPreviews.map((item, i) => (
          <div key={item.roleId} className="spa-card" style={{ marginBottom: 16 }}>
            <p className="spa-heading-3" style={{ marginBottom: 4 }}>
              {i + 1}. {item.extracted.title}
            </p>
            {item.extracted.source_platform && (
              <span className="spa-badge spa-badge-default">{item.extracted.source_platform}</span>
            )}
            {item.extracted.sections.length > 0 && (
              <p className="spa-body-small" style={{ marginTop: 8 }}>
                {item.extracted.sections[0].content.slice(0, 150)}
                {item.extracted.sections[0].content.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        ))}
        {error && <p className="spa-body-small" style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="spa-btn spa-btn-primary"
            onClick={handleBatchBeautify}
            disabled={beautifying}
          >
            {beautifying ? 'Beautifying...' : 'Beautify All'}
          </button>
          <button
            className="spa-btn spa-btn-secondary"
            onClick={() => router.push('/hiring-spa/roles')}
          >
            Skip — Save as Drafts
          </button>
        </div>
      </div>
    )
  }

  // Single extraction preview
  if (extracted && roleId) {
    return (
      <div>
        <p className="spa-label-emphasis" style={{ marginBottom: 16 }}>Extraction Preview</p>
        <div className="spa-card" style={{ marginBottom: 24 }}>
          <p className="spa-heading-2" style={{ marginBottom: 8 }}>{extracted.title}</p>
          {extracted.source_platform && (
            <span className="spa-badge spa-badge-default" style={{ marginBottom: 12 }}>
              {extracted.source_platform}
            </span>
          )}
          {extracted.sections.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {extracted.sections.map((s, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <p className="spa-label" style={{ marginBottom: 4 }}>{s.heading}</p>
                  <p className="spa-body-small" style={{ whiteSpace: 'pre-wrap' }}>
                    {s.content.slice(0, 300)}{s.content.length > 300 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Challenge prompt — optional */}
        <div className="spa-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: challengeEnabled ? 12 : 0 }}>
            <div>
              <p className="spa-heading-3" style={{ marginBottom: 4 }}>Do you have a take-home challenge for this role?</p>
              <p className="spa-body-small" style={{ fontStyle: 'italic' }}>You can always add or edit this later.</p>
            </div>
            <button
              className={`spa-toggle ${challengeEnabled ? 'spa-toggle-active' : ''}`}
              onClick={() => setChallengeEnabled(prev => !prev)}
            >
              <span className="spa-toggle-knob" />
            </button>
          </div>
          {challengeEnabled && (
            <div className="spa-form-field" style={{ marginBottom: 0 }}>
              <label className="spa-form-label">Challenge Prompt</label>
              <textarea
                className="spa-textarea"
                placeholder="Describe a short challenge or take-home prompt for candidates..."
                value={challengePrompt}
                onChange={e => setChallengePrompt(e.target.value)}
                style={{ minHeight: 100 }}
              />
            </div>
          )}
        </div>

        {error && <p className="spa-body-small" style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="spa-btn spa-btn-primary"
            onClick={handleBeautify}
            disabled={beautifying}
          >
            {beautifying ? 'Beautifying...' : 'Beautify This JD'}
          </button>
          <button
            className="spa-btn spa-btn-secondary"
            onClick={handleSkipToDraft}
          >
            Skip — Save as Draft
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <button
          className={`spa-btn ${mode === 'url' ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
          onClick={() => setMode('url')}
        >
          From URL
        </button>
        <button
          className={`spa-btn ${mode === 'text' ? 'spa-btn-primary' : 'spa-btn-secondary'}`}
          onClick={() => setMode('text')}
        >
          Paste Text
        </button>
      </div>

      {mode === 'url' ? (
        <div className="spa-form-field">
          <label className="spa-form-label">Job Posting URL(s)</label>
          <textarea
            className="spa-textarea"
            placeholder={"https://boards.greenhouse.io/yourcompany/jobs/123\nhttps://boards.greenhouse.io/yourcompany/jobs/456"}
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            style={{ minHeight: 80 }}
          />
          <p className="spa-body-small" style={{ marginTop: 8 }}>
            One URL per line. Supports Greenhouse, Lever, Ashby, Workable, and most career pages.
          </p>
        </div>
      ) : (
        <>
          <div className="spa-form-field">
            <label className="spa-form-label">Role Title</label>
            <input
              className="spa-input"
              type="text"
              placeholder="Senior Backend Engineer"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="spa-form-field">
            <label className="spa-form-label">Job Description</label>
            <textarea
              className="spa-textarea"
              placeholder="Paste the full job description here..."
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              style={{ minHeight: 240 }}
            />
          </div>
        </>
      )}

      {error && <p className="spa-body-small" style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>}

      <button
        className="spa-btn spa-btn-primary"
        disabled={extracting || (mode === 'url' ? !urlInput.trim() : !rawText)}
        onClick={handleExtract}
      >
        {extracting ? 'Extracting...' : 'Extract & Create Role'}
      </button>
    </div>
  )
}
