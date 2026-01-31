'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import EngineersTable from '@/components/admin/EngineersTable'
import EngineerDetail from '@/components/admin/EngineerDetail'

interface Engineer {
  id: string
  name: string
  email: string
  focus_areas?: string[]
  is_available_for_cycles: boolean
  availability_hours_per_week?: number
  github_url?: string
  created_at: string
}

export default function AdminEngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [focusFilter, setFocusFilter] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  const loadEngineers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/engineers')
      if (res.ok) {
        const data = await res.json()
        setEngineers(data.engineers)
      }
    } catch (e) {
      console.error('Failed to load engineers:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEngineers()
  }, [loadEngineers])

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
          <button
            className="btn-primary"
            onClick={() => setSelectedId('new')}
            style={{ marginTop: 'var(--space-2)' }}
          >
            Add Engineer
          </button>
        </div>

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
      </div>
    </div>
  )
}
