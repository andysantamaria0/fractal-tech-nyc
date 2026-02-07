'use client'

import { useState, useEffect } from 'react'

interface SpotlightDetailProps {
  spotlightId: string | 'new'
  onClose: () => void
  onSaved: () => void
}

type ContentType = 'video' | 'text' | 'embed'

function isValidPreviewUrl(url: string): boolean {
  try {
    return new URL(url.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-2)',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
}

export default function SpotlightDetail({
  spotlightId,
  onClose,
  onSaved,
}: SpotlightDetailProps) {
  const isNew = spotlightId === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('video')
  const [contentUrl, setContentUrl] = useState('')
  const [contentBody, setContentBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState(0)

  useEffect(() => {
    if (isNew) return
    loadSpotlight()
  }, [spotlightId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSpotlight() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/spotlights/${spotlightId}`)
      if (res.ok) {
        const { spotlight: s } = await res.json()
        setTitle(s.title || '')
        setContentType(s.content_type || 'video')
        setContentUrl(s.content_url || '')
        setContentBody(s.content_body || '')
        setIsActive(s.is_active ?? true)
        setDisplayOrder(s.display_order ?? 0)
      } else {
        setError('Failed to load spotlight')
      }
    } catch {
      setError('Failed to load spotlight')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if ((contentType === 'video' || contentType === 'embed') && !contentUrl.trim()) {
      setError('URL is required for video and embed types')
      return
    }

    if (contentType === 'text' && !contentBody.trim()) {
      setError('Body text is required for text type')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = isNew ? '/api/admin/spotlights' : `/api/admin/spotlights/${spotlightId}`
      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content_type: contentType,
          content_url: contentUrl.trim() || null,
          content_body: contentBody.trim() || null,
          is_active: isActive,
          display_order: displayOrder,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this spotlight item?')) return
    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/spotlights/${spotlightId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-detail-panel">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  return (
    <div className="admin-detail-panel">
      <div className="admin-detail-header">
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          {isNew ? 'Add Spotlight' : 'Edit Spotlight'}
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        <div className="form-group">
          <label htmlFor="sl-title" style={labelStyle}>Title</label>
          <input
            id="sl-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Spotlight title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="sl-type" style={labelStyle}>Content Type</label>
          <select
            id="sl-type"
            className="form-select"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
          >
            <option value="video">Video (YouTube/Vimeo/Loom)</option>
            <option value="embed">Embed (Website/Portfolio)</option>
            <option value="text">Text</option>
          </select>
        </div>

        {(contentType === 'video' || contentType === 'embed') && (
          <div className="form-group">
            <label htmlFor="sl-url" style={labelStyle}>
              {contentType === 'video' ? 'Embed URL' : 'Website URL'}
            </label>
            <input
              id="sl-url"
              type="url"
              className="form-input"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder={
                contentType === 'video'
                  ? 'https://www.youtube.com/embed/...'
                  : 'https://example.com'
              }
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
              {contentType === 'video'
                ? 'Use the embed URL (e.g. youtube.com/embed/ID, player.vimeo.com/video/ID)'
                : 'The URL will be rendered in an iframe on the dashboard'}
            </p>
          </div>
        )}

        {contentType === 'text' && (
          <div className="form-group">
            <label htmlFor="sl-body" style={labelStyle}>Body Text</label>
            <textarea
              id="sl-body"
              className="form-input"
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              placeholder="Spotlight body text..."
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="sl-order" style={labelStyle}>Display Order</label>
            <input
              id="sl-order"
              type="number"
              className="form-input"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              min={0}
              style={{ maxWidth: 100 }}
            />
          </div>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        {(contentType === 'video' || contentType === 'embed') && isValidPreviewUrl(contentUrl) && (
          <div className="admin-detail-section" style={{ marginTop: 'var(--space-4)' }}>
            <div className="section-label">Preview</div>
            <div style={{ border: '2px solid var(--color-charcoal)', borderRadius: 2, overflow: 'hidden' }}>
              <iframe
                src={contentUrl}
                title={title || 'Preview'}
                style={{ width: '100%', height: contentType === 'video' ? 200 : 300, border: 'none' }}
                allowFullScreen
              />
            </div>
          </div>
        )}

        {contentType === 'text' && contentBody.trim() && (
          <div className="admin-detail-section" style={{ marginTop: 'var(--space-4)' }}>
            <div className="section-label">Preview</div>
            <div style={{ padding: 'var(--space-3)', border: '2px solid var(--color-charcoal)', borderRadius: 2 }}>
              <p style={{ fontWeight: 700, marginBottom: 'var(--space-3)' }}>{title}</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>{contentBody}</p>
            </div>
          </div>
        )}

        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {saving ? 'Saving...' : isNew ? 'Create Spotlight' : 'Save Changes'}
        </button>

        {!isNew && (
          <button
            className="btn-secondary btn-full"
            onClick={handleDelete}
            disabled={deleting}
            style={{ marginTop: 'var(--space-3)', color: 'var(--color-red, #c00)' }}
          >
            {deleting ? 'Deleting...' : 'Delete Spotlight'}
          </button>
        )}
      </div>
    </div>
  )
}
