'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import CompaniesTable from '@/components/admin/CompaniesTable'
import CompanyDetail from '@/components/admin/CompanyDetail'
import AddCompanyForm from '@/components/admin/AddCompanyForm'
import CompanyImport from '@/components/admin/CompanyImport'

interface Company {
  id: string
  name: string
  email: string
  company_linkedin?: string
  company_stage?: string
  newsletter_optin?: boolean
  created_at: string
}

type Tab = 'directory' | 'import'

export default function AdminCompaniesPage() {
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'import' ? 'import' : 'directory'
  )

  // Filters
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies)
      }
    } catch (e) {
      console.error('Failed to load companies:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  // Derive unique stages for filter dropdown
  const allStages = useMemo(() => {
    const stages = new Set<string>()
    for (const co of companies) {
      if (co.company_stage) stages.add(co.company_stage)
    }
    return Array.from(stages).sort()
  }, [companies])

  const STAGE_LABELS: Record<string, string> = {
    bootstrapped: 'Bootstrapped',
    angel: 'Angel',
    'pre-seed': 'Pre-Seed',
    seed: 'Seed',
    bigger: 'Series A+',
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = companies
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
    }
    if (stageFilter) {
      result = result.filter((c) => c.company_stage === stageFilter)
    }
    return result
  }, [companies, search, stageFilter])

  function handleSaved() {
    loadCompanies()
    setSelectedId(null)
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setSelectedId(null)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label">Admin</div>
            <h1 className="section-title">Companies</h1>
          </div>
          {activeTab === 'directory' && (
            <button
              className="btn-primary"
              onClick={() => setSelectedId('new')}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Add Company
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--color-border, #e2e2e2)', marginBottom: 'var(--space-5)' }}>
          <button
            onClick={() => handleTabChange('directory')}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'directory' ? '2px solid var(--color-ink)' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'directory' ? 'var(--color-ink)' : 'var(--color-slate)',
            }}
          >
            Directory
          </button>
          <button
            onClick={() => handleTabChange('import')}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'import' ? '2px solid var(--color-ink)' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'import' ? 'var(--color-ink)' : 'var(--color-slate)',
            }}
          >
            Import
          </button>
        </div>

        {activeTab === 'directory' && (
          <>
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
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                <option value="">All Stages</option>
                {allStages.map((stage) => (
                  <option key={stage} value={stage}>{STAGE_LABELS[stage] || stage}</option>
                ))}
              </select>
            </div>

            {/* Table + Detail layout */}
            <div className={selectedId ? 'admin-split-layout' : ''}>
              <div className={selectedId ? 'admin-split-main' : ''}>
                <div className="window">
                  <div className="window-title">
                    Companies ({loading ? '...' : filtered.length})
                  </div>
                  <div style={{ padding: 0 }}>
                    {loading ? (
                      <div className="loading-text">Loading companies...</div>
                    ) : (
                      <CompaniesTable
                        companies={filtered}
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
                      {selectedId === 'new' ? 'Add Company' : 'Company Detail'}
                    </div>
                    {selectedId === 'new' ? (
                      <AddCompanyForm
                        onClose={() => setSelectedId(null)}
                        onSaved={handleSaved}
                      />
                    ) : (
                      <CompanyDetail
                        companyId={selectedId}
                        onClose={() => setSelectedId(null)}
                        onSaved={handleSaved}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'import' && <CompanyImport />}
      </div>
    </div>
  )
}
