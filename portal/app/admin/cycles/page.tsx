'use client'

import { useState, useEffect, useCallback } from 'react'
import CyclesTable from '@/components/admin/CyclesTable'
import SubmissionDetail from '@/components/admin/SubmissionDetail'

interface Submission {
  id: string
  title: string
  status: string
  timeline: string
  is_hiring: boolean
  created_at: string
  sprint_start_date?: string
  sprint_end_date?: string
  hours_budget?: number
  hours_logged?: number
  assigned_engineer_id?: string
  profiles?: { name: string; email: string; company_linkedin: string }
  assigned_engineer?: { id: string; name: string } | null
  preferred_engineer?: { id: string; name: string } | null
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminCyclesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Filters
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [hiringOnly, setHiringOnly] = useState(false)

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('status', activeTab)
    if (overdueOnly) params.set('overdue', 'true')
    if (unassignedOnly) params.set('unassigned', 'true')
    if (hiringOnly) params.set('hiring', 'true')

    try {
      const res = await fetch(`/api/admin/cycles?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions)
      }
    } catch (e) {
      console.error('Failed to load submissions:', e)
    } finally {
      setLoading(false)
    }
  }, [activeTab, overdueOnly, unassignedOnly, hiringOnly])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Cycles Dashboard</h1>
        </div>

        {/* Status Tabs */}
        <div className="admin-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`admin-tab ${activeTab === tab.value ? 'admin-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <label className="form-checkbox">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            <span>Overdue Only</span>
          </label>
          <label className="form-checkbox">
            <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
            <span>Unassigned Only</span>
          </label>
          <label className="form-checkbox">
            <input type="checkbox" checked={hiringOnly} onChange={(e) => setHiringOnly(e.target.checked)} />
            <span>Hiring Only</span>
          </label>
        </div>

        {/* Table + Detail layout */}
        <div className={selectedId ? 'admin-split-layout' : ''}>
          <div className={selectedId ? 'admin-split-main' : ''}>
            <div className="window">
              <div className="window-title">
                Feature Submissions ({loading ? '...' : submissions.length})
              </div>
              <div style={{ padding: 0 }}>
                {loading ? (
                  <div className="loading-text">Loading submissions...</div>
                ) : (
                  <CyclesTable
                    submissions={submissions}
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
                <div className="window-title">Submission Detail</div>
                <SubmissionDetail
                  submissionId={selectedId}
                  onClose={() => setSelectedId(null)}
                  onUpdated={loadSubmissions}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
