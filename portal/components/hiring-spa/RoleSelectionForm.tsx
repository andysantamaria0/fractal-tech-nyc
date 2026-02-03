'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DiscoveredRole } from '@/lib/hiring-spa/types'

interface Props {
  discoveredRoles: DiscoveredRole[]
}

export default function RoleSelectionForm({ discoveredRoles }: Props) {
  const router = useRouter()
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(
    new Set(discoveredRoles.filter(r => r.confidence >= 0.8).map(r => r.url))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleRole = useCallback((url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedUrls(new Set(discoveredRoles.map(r => r.url)))
  }, [discoveredRoles])

  const deselectAll = useCallback(() => {
    setSelectedUrls(new Set())
  }, [])

  const handleImport = useCallback(async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/hiring-spa/roles/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_urls: Array.from(selectedUrls) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to import roles')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }, [selectedUrls, router])

  const handleSkip = useCallback(async () => {
    setSubmitting(true)
    setError('')
    try {
      await fetch('/api/hiring-spa/roles/select', { method: 'PATCH' })
      router.refresh()
    } catch {
      setError('Failed to skip')
    } finally {
      setSubmitting(false)
    }
  }, [router])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button type="button" className="spa-btn-text" onClick={selectAll}>Select all</button>
        <button type="button" className="spa-btn-text" onClick={deselectAll}>Deselect all</button>
        <span className="spa-body-small" style={{ marginLeft: 'auto' }}>
          {selectedUrls.size} of {discoveredRoles.length} selected
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {discoveredRoles.map(role => (
          <label
            key={role.url}
            className="spa-card"
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              cursor: 'pointer',
              borderColor: selectedUrls.has(role.url) ? 'var(--spa-honey)' : undefined,
              transition: 'border-color 0.2s',
            }}
          >
            <input
              type="checkbox"
              checked={selectedUrls.has(role.url)}
              onChange={() => toggleRole(role.url)}
              style={{ marginTop: 4, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <p className="spa-heading-3" style={{ marginBottom: 4 }}>{role.title}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {role.source_platform !== 'generic' && (
                  <span className="spa-badge spa-badge-default">{role.source_platform}</span>
                )}
                {role.confidence >= 0.8 && (
                  <span className="spa-badge spa-badge-honey">high match</span>
                )}
              </div>
              <p className="spa-body-small" style={{ color: 'var(--spa-graphite)', margin: 0 }}>
                {role.raw_text.slice(0, 200)}{role.raw_text.length > 200 ? '...' : ''}
              </p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="spa-body-small" style={{ color: '#c0392b', marginTop: 16 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {selectedUrls.size > 0 ? (
          <>
            <button
              className="spa-btn spa-btn-primary"
              onClick={handleImport}
              disabled={submitting}
            >
              {submitting ? 'Importing...' : `Import ${selectedUrls.size} Role${selectedUrls.size === 1 ? '' : 's'}`}
            </button>
            <button
              className="spa-btn spa-btn-secondary"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for now
            </button>
          </>
        ) : (
          <button
            className="spa-btn spa-btn-primary"
            onClick={handleSkip}
            disabled={submitting}
          >
            {submitting ? 'Continuing...' : 'Continue to Questionnaire'}
          </button>
        )}
      </div>
    </div>
  )
}
