'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import EngineersTable from '@/components/admin/EngineersTable'
import EngineerDetail from '@/components/admin/EngineerDetail'
import EngineerImport from '@/components/admin/EngineerImport'

interface Engineer {
  id: string
  name: string
  email: string
  focus_areas?: string[]
  is_available_for_cycles: boolean
  availability_hours_per_week?: number
  github_url?: string
  created_at: string
  interest_count?: number
}

interface AmaSubmission {
  id: string
  name: string
  email: string
  twitter: string
  phone: string
  context: string
  question: string
  tag_preference: string
  created_at: string
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

export default function AdminEngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [focusFilter, setFocusFilter] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  // AMA state
  const [amaSubmissions, setAmaSubmissions] = useState<AmaSubmission[]>([])
  const [amaLoading, setAmaLoading] = useState(true)
  const [amaSearch, setAmaSearch] = useState('')
  const [amaTagFilter, setAmaTagFilter] = useState('')
  const [selectedAmaId, setSelectedAmaId] = useState<string | null>(null)

  const loadEngineers = useCallback(async () => {
    setLoading(true)
    try {
      const [engRes, interestRes] = await Promise.all([
        fetch('/api/admin/engineers'),
        fetch('/api/admin/engineers/interests'),
      ])
      if (engRes.ok) {
        const data = await engRes.json()
        let engs = data.engineers
        if (interestRes.ok) {
          const interestData = await interestRes.json()
          const counts: Record<string, number> = interestData.counts || {}
          engs = engs.map((e: Engineer) => ({ ...e, interest_count: counts[e.id] || 0 }))
        }
        setEngineers(engs)
      }
    } catch (e) {
      console.error('Failed to load engineers:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAmaSubmissions = useCallback(async () => {
    setAmaLoading(true)
    try {
      const res = await fetch('/api/admin/ama')
      if (res.ok) {
        const data = await res.json()
        setAmaSubmissions(data.submissions)
      }
    } catch (e) {
      console.error('Failed to load AMA submissions:', e)
    } finally {
      setAmaLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEngineers()
    loadAmaSubmissions()
  }, [loadEngineers, loadAmaSubmissions])

  // Derive unique focus areas for the filter dropdown
  const allFocusAreas = useMemo(() => {
    const areas = new Set<string>()
    for (const eng of engineers) {
      for (const area of eng.focus_areas || []) {
        areas.add(area)
      }
    }
    return Array.from(areas).sort()
  }, [engineers])

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = engineers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      )
    }
    if (focusFilter) {
      result = result.filter((e) => e.focus_areas?.includes(focusFilter))
    }
    if (availableOnly) {
      result = result.filter((e) => e.is_available_for_cycles)
    }
    return result
  }, [engineers, search, focusFilter, availableOnly])

  const filteredAma = useMemo(() => {
    let result = amaSubmissions
    if (amaSearch.trim()) {
      const q = amaSearch.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.twitter.toLowerCase().includes(q)
      )
    }
    if (amaTagFilter) {
      result = result.filter((s) => s.tag_preference === amaTagFilter)
    }
    return result
  }, [amaSubmissions, amaSearch, amaTagFilter])

  const selectedAma = useMemo(
    () => amaSubmissions.find((s) => s.id === selectedAmaId) || null,
    [amaSubmissions, selectedAmaId]
  )

  async function handleToggleAvailability(id: string, available: boolean) {
    // Optimistic update
    setEngineers((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_available_for_cycles: available } : e))
    )

    try {
      const res = await fetch(`/api/admin/engineers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available_for_cycles: available }),
      })
      if (!res.ok) {
        // Revert on failure
        setEngineers((prev) =>
          prev.map((e) => (e.id === id ? { ...e, is_available_for_cycles: !available } : e))
        )
      }
    } catch {
      setEngineers((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_available_for_cycles: !available } : e))
      )
    }
  }

  function handleSaved() {
    loadEngineers()
    setSelectedId(null)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label">Admin</div>
            <h1 className="section-title">Engineers</h1>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowImport((v) => !v)}
            >
              {showImport ? 'Hide Import' : 'Bulk Import'}
            </button>
            <button
              className="btn-primary"
              onClick={() => setSelectedId('new')}
            >
              Add Engineer
            </button>
          </div>
        </div>

        {showImport && (
          <EngineerImport onImported={() => { loadEngineers(); setShowImport(false) }} />
        )}

        {/* Filters */}
        <div className="admin-filters">
          <input
            type="text"
            className="form-input"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <select
            className="form-select"
            value={focusFilter}
            onChange={(e) => setFocusFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="">All Focus Areas</option>
            {allFocusAreas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <label className="form-checkbox">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            <span>Available Only</span>
          </label>
        </div>

        {/* Table + Detail layout */}
        <div className={selectedId ? 'admin-split-layout' : ''}>
          <div className={selectedId ? 'admin-split-main' : ''}>
            <div className="window">
              <div className="window-title">
                Engineers ({loading ? '...' : filtered.length})
              </div>
              <div style={{ padding: 0 }}>
                {loading ? (
                  <div className="loading-text">Loading engineers...</div>
                ) : (
                  <EngineersTable
                    engineers={filtered}
                    onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                    selectedId={selectedId || undefined}
                    onToggleAvailability={handleToggleAvailability}
                  />
                )}
              </div>
            </div>
          </div>

          {selectedId && (
            <div className="admin-split-detail">
              <div className="window">
                <div className="window-title">
                  {selectedId === 'new' ? 'New Engineer' : 'Engineer Detail'}
                </div>
                <EngineerDetail
                  engineerId={selectedId}
                  onClose={() => setSelectedId(null)}
                  onSaved={handleSaved}
                />
              </div>
            </div>
          )}
        </div>

        {/* AMA Submissions */}
        <div>
          <div className="section-label">Submissions</div>
          <h2 className="section-title">AMA</h2>
        </div>

        <div className="admin-filters">
          <input
            type="text"
            className="form-input"
            placeholder="Search name, email, or twitter..."
            value={amaSearch}
            onChange={(e) => setAmaSearch(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <select
            className="form-select"
            value={amaTagFilter}
            onChange={(e) => setAmaTagFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="">All Preferences</option>
            <option value="tag-me">Tag Me</option>
            <option value="keep-anon">Keep Anon</option>
          </select>
        </div>

        <div className={selectedAmaId ? 'admin-split-layout' : ''}>
          <div className={selectedAmaId ? 'admin-split-main' : ''}>
            <div className="window">
              <div className="window-title">
                AMA Submissions ({amaLoading ? '...' : filteredAma.length})
              </div>
              <div style={{ padding: 0 }}>
                {amaLoading ? (
                  <div className="loading-text">Loading submissions...</div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Twitter</th>
                          <th>Phone</th>
                          <th>Context</th>
                          <th>Question</th>
                          <th>Tag Pref</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAma.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => setSelectedAmaId(s.id === selectedAmaId ? null : s.id)}
                            className={selectedAmaId === s.id ? 'admin-row-selected' : ''}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ fontWeight: 700 }}>{s.name}</td>
                            <td>{s.email}</td>
                            <td>{s.twitter}</td>
                            <td>{s.phone}</td>
                            <td>{truncate(s.context, 60)}</td>
                            <td>{truncate(s.question, 60)}</td>
                            <td>
                              <span className="admin-flag">{s.tag_preference}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {new Date(s.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedAma && (
            <div className="admin-split-detail">
              <div className="window">
                <div className="window-title">Submission Detail</div>
                <div className="admin-detail-panel">
                  <div className="admin-detail-header">
                    <h3>{selectedAma.name}</h3>
                    <button className="btn-secondary" onClick={() => setSelectedAmaId(null)}>
                      Close
                    </button>
                  </div>
                  <div className="admin-detail-body">
                    <div className="admin-detail-section">
                      <div className="section-label">Contact</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Email</div>
                          <div>{selectedAma.email}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Twitter</div>
                          <div>{selectedAma.twitter}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Phone</div>
                          <div>{selectedAma.phone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Tag Preference</div>
                          <div><span className="admin-flag">{selectedAma.tag_preference}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-detail-section">
                      <div className="section-label">Context</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selectedAma.context}</div>
                    </div>
                    <div className="admin-detail-section">
                      <div className="section-label">Question</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selectedAma.question}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-mid)' }}>
                      Submitted {new Date(selectedAma.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
