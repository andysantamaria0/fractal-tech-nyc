'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MatchingPreferences } from '@/lib/hiring-spa/types'

const SECTION_LABELS: Record<keyof MatchingPreferences, string> = {
  excluded_locations: 'Excluded Locations',
  excluded_companies: 'Excluded Companies',
  excluded_company_domains: 'Excluded Domains',
  excluded_keywords: 'Excluded Keywords',
}

const SECTION_ORDER: (keyof MatchingPreferences)[] = [
  'excluded_locations',
  'excluded_companies',
  'excluded_company_domains',
  'excluded_keywords',
]

const EMPTY_PREFS: MatchingPreferences = {
  excluded_locations: [],
  excluded_companies: [],
  excluded_company_domains: [],
  excluded_keywords: [],
}

export default function MatchingPreferencesEditor() {
  const [prefs, setPrefs] = useState<MatchingPreferences>(EMPTY_PREFS)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/engineer/preferences')
      .then(res => res.json())
      .then(data => {
        if (data.preferences) {
          setPrefs({ ...EMPTY_PREFS, ...data.preferences })
        }
      })
      .catch(err => console.error('Failed to load preferences:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = useCallback(async (type: keyof MatchingPreferences, value: string) => {
    const key = `${type}:${value}`
    setDeleting(key)
    try {
      const res = await fetch('/api/engineer/preferences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.preferences) {
          setPrefs({ ...EMPTY_PREFS, ...data.preferences })
        }
      }
    } catch (err) {
      console.error('Failed to delete preference:', err)
    } finally {
      setDeleting(null)
    }
  }, [])

  const hasAnyRules = SECTION_ORDER.some(key => (prefs[key]?.length || 0) > 0)

  if (loading) {
    return (
      <div className="engineer-preferences-section">
        <h3>Matching Preferences</h3>
        <div className="loading-text">Loading preferences...</div>
      </div>
    )
  }

  return (
    <div className="engineer-preferences-section">
      <h3>Matching Preferences</h3>
      <p className="engineer-preferences-desc">
        These rules filter out jobs before matching. They&apos;re created when you mark a job as &quot;Not a Fit&quot; and accept the suggested rule.
      </p>

      {!hasAnyRules ? (
        <div className="engineer-preferences-empty">
          No filter rules yet. When you mark jobs as &quot;Not a Fit,&quot; you&apos;ll be offered rules to automatically filter similar jobs in the future.
        </div>
      ) : (
        <div className="engineer-preferences-groups">
          {SECTION_ORDER.map(key => {
            const values = prefs[key] || []
            if (values.length === 0) return null
            return (
              <div key={key} className="engineer-preferences-group">
                <div className="engineer-preferences-group-label">{SECTION_LABELS[key]}</div>
                <div className="engineer-preferences-pills">
                  {values.map(value => {
                    const deleteKey = `${key}:${value}`
                    return (
                      <span key={value} className="engineer-preferences-pill">
                        <span>{value}</span>
                        <button
                          className="engineer-preferences-pill-delete"
                          onClick={() => handleDelete(key, value)}
                          disabled={deleting === deleteKey}
                          type="button"
                          aria-label={`Remove ${value}`}
                        >
                          {deleting === deleteKey ? '...' : '\u00D7'}
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
