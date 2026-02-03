'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  slug: string
  email: string
  challengePrompt: string
  onSubmitted: (submission: { id: string; submitted_at: string }) => void
}

export default function ChallengeSubmissionForm({ slug, email, challengePrompt, onSubmitted }: Props) {
  const [textResponse, setTextResponse] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasContent = textResponse.trim() || linkUrl.trim() || fileUrl

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('challenge-submissions')
        .upload(path, file)

      if (uploadError) {
        setError('File upload failed')
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-submissions')
        .getPublicUrl(path)

      setFileUrl(publicUrl)
      setFileName(file.name)
    } catch {
      setError('File upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasContent) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/jd/challenge-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email,
          text_response: textResponse.trim() || undefined,
          link_url: linkUrl.trim() || undefined,
          file_url: fileUrl || undefined,
          file_name: fileName || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit')
        return
      }

      onSubmitted({
        id: data.submission_id,
        submitted_at: new Date().toISOString(),
      })
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }, [slug, email, textResponse, linkUrl, fileUrl, fileName, hasContent, onSubmitted])

  return (
    <div className="jd-challenge-form">
      <p className="spa-label-emphasis" style={{ marginBottom: 12 }}>Submit Your Challenge Response</p>
      <div className="jd-challenge-prompt" style={{ marginBottom: 20 }}>
        {challengePrompt}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="jd-challenge-form-field">
          <label className="jd-challenge-form-label">Your Response</label>
          <textarea
            className="jd-challenge-form-textarea"
            placeholder="Write your response here..."
            value={textResponse}
            onChange={e => setTextResponse(e.target.value)}
            rows={6}
          />
        </div>

        <div className="jd-challenge-form-field">
          <label className="jd-challenge-form-label">Link</label>
          <input
            className="jd-challenge-form-input"
            type="url"
            placeholder="https://github.com/..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
          />
        </div>

        <div className="jd-challenge-form-field">
          <label className="jd-challenge-form-label">File Upload</label>
          <div className="jd-challenge-file-upload">
            {fileName ? (
              <span className="jd-challenge-file-name">{fileName}</span>
            ) : (
              <label className="spa-btn spa-btn-secondary jd-challenge-file-btn">
                {uploading ? 'Uploading...' : 'Choose File'}
                <input
                  type="file"
                  accept=".pdf,.zip,.tar.gz,.md,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>

        {error && <p className="jd-challenge-form-error">{error}</p>}

        <button
          className="spa-btn spa-btn-primary"
          type="submit"
          disabled={!hasContent || submitting || uploading}
          style={{ width: '100%' }}
        >
          {submitting ? 'Submitting...' : 'Submit Challenge Response'}
        </button>
      </form>
    </div>
  )
}
