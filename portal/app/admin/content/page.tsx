'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import HighlightsTable from '@/components/admin/HighlightsTable'
import HighlightDetail from '@/components/admin/HighlightDetail'
import SpotlightsTable from '@/components/admin/SpotlightsTable'
import SpotlightDetail from '@/components/admin/SpotlightDetail'

interface Highlight {
  id: string
  week_number: number
  cohort_start_date: string
  title?: string
  description: string
  created_at: string
}

interface Spotlight {
  id: string
  title: string
  content_type: 'video' | 'text' | 'image' | 'embed'
  content_url?: string
  content_body?: string
  is_active: boolean
  display_order: number
  created_at: string
}

type Tab = 'highlights' | 'spotlight'

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>('highlights')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Highlights state
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [highlightsLoading, setHighlightsLoading] = useState(true)

  // Spotlights state
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const [spotlightsLoading, setSpotlightsLoading] = useState(true)

  // Cohort info for current week helper
  const [currentWeek, setCurrentWeek] = useState(1)
  const [cohortStartDate, setCohortStartDate] = useState('')

  const loadHighlights = useCallback(async () => {
    setHighlightsLoading(true)
    try {
      const res = await fetch('/api/admin/highlights')
      if (res.ok) {
        const data = await res.json()
        setHighlights(data.highlights)
      }
    } catch (e) {
      console.error('Failed to load highlights:', e)
    } finally {
      setHighlightsLoading(false)
    }
  }, [])

  const loadSpotlights = useCallback(async () => {
    setSpotlightsLoading(true)
    try {
      const res = await fetch('/api/admin/spotlights')
      if (res.ok) {
        const data = await res.json()
        setSpotlights(data.spotlights)
      }
    } catch (e) {
      console.error('Failed to load spotlights:', e)
    } finally {
      setSpotlightsLoading(false)
    }
  }, [])

  const loadCohortInfo = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: activeCohort } = await supabase
        .from('cohort_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      if (activeCohort) {
        setCohortStartDate(activeCohort.start_date)
        // Calculate current week
        const start = new Date(activeCohort.start_date)
        const now = new Date()
        const diffMs = now.getTime() - start.getTime()
        const calendarWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
        const breakWeek = activeCohort.break_week as number | null
        const adjustedWeek = breakWeek && calendarWeek > breakWeek
          ? calendarWeek - 1
          : calendarWeek
        setCurrentWeek(Math.max(1, Math.min(adjustedWeek, activeCohort.duration_weeks || 12)))
      }
    } catch (e) {
      console.error('Failed to load cohort info:', e)
    }
  }, [])

  useEffect(() => {
    loadCohortInfo()
    loadHighlights()
    loadSpotlights()
  }, [loadCohortInfo, loadHighlights, loadSpotlights])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setSelectedId(null)
  }

  function handleHighlightSaved() {
    loadHighlights()
    setSelectedId(null)
  }

  function handleSpotlightSaved() {
    loadSpotlights()
    setSelectedId(null)
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    // Optimistic update
    setSpotlights((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
    )

    try {
      const res = await fetch(`/api/admin/spotlights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!res.ok) {
        // Revert on failure
        setSpotlights((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
        )
      }
    } catch {
      // Revert on failure
      setSpotlights((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
      )
    }
  }

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: 'var(--space-3) var(--space-5)',
    fontSize: 'var(--text-sm)',
    fontWeight: 700,
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--color-ink)' : '2px solid transparent',
    cursor: 'pointer',
    color: activeTab === tab ? 'var(--color-ink)' : 'var(--color-slate)',
  })

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label">Admin</div>
            <h1 className="section-title">Content</h1>
          </div>
          {activeTab === 'highlights' && (
            <button
              className="btn-primary"
              onClick={() => setSelectedId('new')}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Add Highlight
            </button>
          )}
          {activeTab === 'spotlight' && (
            <button
              className="btn-primary"
              onClick={() => setSelectedId('new')}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Add Spotlight
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--color-border, #e2e2e2)', marginBottom: 'var(--space-5)' }}>
          <button onClick={() => handleTabChange('highlights')} style={tabStyle('highlights')}>
            Highlights
          </button>
          <button onClick={() => handleTabChange('spotlight')} style={tabStyle('spotlight')}>
            Spotlight
          </button>
        </div>

        {/* Highlights Tab */}
        {activeTab === 'highlights' && (
          <div className={selectedId ? 'admin-split-layout' : ''}>
            <div className={selectedId ? 'admin-split-main' : ''}>
              <div className="window">
                <div className="window-title">
                  Weekly Highlights ({highlightsLoading ? '...' : highlights.length})
                </div>
                <div style={{ padding: 0 }}>
                  {highlightsLoading ? (
                    <div className="loading-text">Loading highlights...</div>
                  ) : (
                    <HighlightsTable
                      highlights={highlights}
                      onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                      selectedId={selectedId || undefined}
                    />
                  )}
                </div>
              </div>
            </div>

            {selectedId && (
              <div className="admin-split-detail">
                <div className="window">
                  <div className="window-title">
                    {selectedId === 'new' ? 'Add Highlight' : 'Edit Highlight'}
                  </div>
                  <HighlightDetail
                    highlightId={selectedId}
                    currentWeek={currentWeek}
                    cohortStartDate={cohortStartDate}
                    onClose={() => setSelectedId(null)}
                    onSaved={handleHighlightSaved}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spotlight Tab */}
        {activeTab === 'spotlight' && (
          <div className={selectedId ? 'admin-split-layout' : ''}>
            <div className={selectedId ? 'admin-split-main' : ''}>
              <div className="window">
                <div className="window-title">
                  Spotlight Items ({spotlightsLoading ? '...' : spotlights.length})
                </div>
                <div style={{ padding: 0 }}>
                  {spotlightsLoading ? (
                    <div className="loading-text">Loading spotlights...</div>
                  ) : (
                    <SpotlightsTable
                      spotlights={spotlights}
                      onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                      selectedId={selectedId || undefined}
                      onToggleActive={handleToggleActive}
                    />
                  )}
                </div>
              </div>
            </div>

            {selectedId && (
              <div className="admin-split-detail">
                <div className="window">
                  <div className="window-title">
                    {selectedId === 'new' ? 'Add Spotlight' : 'Edit Spotlight'}
                  </div>
                  <SpotlightDetail
                    spotlightId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onSaved={handleSpotlightSaved}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
