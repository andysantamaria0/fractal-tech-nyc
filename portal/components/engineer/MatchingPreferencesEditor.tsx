'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MatchingPreferences } from '@/lib/hiring-spa/types'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

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
      <div style={{
        backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
        borderRadius: 8, padding: '24px 28px',
      }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 17, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
          Matching Preferences
        </h3>
        <p style={{ fontFamily: f.mono, fontSize: 12, color: c.mist }}>Loading preferences...</p>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
      borderRadius: 8, padding: '24px 28px',
    }}>
      <h3 style={{ fontFamily: f.serif, fontSize: 17, fontWeight: 400, color: c.charcoal, margin: '0 0 6px 0' }}>
        Matching Preferences
      </h3>
      <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 20px 0', lineHeight: 1.6 }}>
        These rules filter out jobs before matching. They&apos;re created when you mark a job as &quot;Not a Fit&quot; and accept the suggested rule.
      </p>

      {!hasAnyRules ? (
        <div style={{
          fontFamily: f.serif, fontSize: 14, color: c.mist,
          fontStyle: 'italic', padding: '12px 0',
        }}>
          No filter rules yet. When you mark jobs as &quot;Not a Fit,&quot; you&apos;ll be offered rules to automatically filter similar jobs in the future.
        </div>
      ) : (
        <div>
          {SECTION_ORDER.map(key => {
            const values = prefs[key] || []
            if (values.length === 0) return null
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{
                  fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: c.mist, marginBottom: 8,
                }}>
                  {SECTION_LABELS[key]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {values.map(value => {
                    const deleteKey = `${key}:${value}`
                    return (
                      <span key={value} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontFamily: f.mono, fontSize: 11,
                        color: c.match, backgroundColor: c.honeyLight,
                        borderRadius: 4, padding: '5px 10px',
                      }}>
                        <span>{value}</span>
                        <button
                          onClick={() => handleDelete(key, value)}
                          disabled={deleting === deleteKey}
                          type="button"
                          aria-label={`Remove ${value}`}
                          style={{
                            fontFamily: f.mono, fontSize: 13, lineHeight: 1,
                            color: c.mist, background: 'none', border: 'none',
                            cursor: deleting === deleteKey ? 'not-allowed' : 'pointer',
                            padding: 0, marginLeft: 2,
                          }}
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
