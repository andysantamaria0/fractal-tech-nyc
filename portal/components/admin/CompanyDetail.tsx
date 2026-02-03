'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Company } from '@/lib/types'
import { labelStyle, COMPANY_STAGES } from '@/lib/constants'

interface HiringProfileStatus {
  id: string
  status: string
  crawl_error: string | null
  crawl_completed_at: string | null
  company_dna: Record<string, unknown> | null
  technical_environment: Record<string, unknown> | null
}

interface ATSConnectionInfo {
  id: string
  provider: string
  api_key: string // masked
  last_sync_at: string | null
  last_sync_error: string | null
  last_sync_role_count: number | null
}

interface CompanyDetailProps {
  companyId: string
  onClose: () => void
  onSaved: () => void
}

export default function CompanyDetail({ companyId, onClose, onSaved }: CompanyDetailProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<Company | null>(null)

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [newsletterOptin, setNewsletterOptin] = useState(false)
  const [hasHiringSpaAccess, setHasHiringSpaAccess] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [githubOrg, setGithubOrg] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [hiringProfile, setHiringProfile] = useState<HiringProfileStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ATS state
  const [atsConnection, setAtsConnection] = useState<ATSConnectionInfo | null>(null)
  const [atsApiKey, setAtsApiKey] = useState('')
  const [atsTesting, setAtsTesting] = useState(false)
  const [atsTestResult, setAtsTestResult] = useState<boolean | null>(null)
  const [atsSaving, setAtsSaving] = useState(false)
  const [atsSyncing, setAtsSyncing] = useState(false)
  const atsSyncPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadCompany()
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCompany() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`)
      if (res.ok) {
        const { company: co } = await res.json()
        setCompany(co)
        setName(co.name || '')
        setCompanyName(co.company_name || '')
        setCompanyLinkedin(co.company_linkedin || '')
        setCompanyStage(co.company_stage || '')
        setNewsletterOptin(co.newsletter_optin || false)
        setHasHiringSpaAccess(co.has_hiring_spa_access || false)
        setWebsiteUrl(co.website_url || '')
        setGithubOrg(co.github_org || '')
      } else {
        setError('Failed to load company')
      }
    } catch {
      setError('Failed to load company')
    } finally {
      setLoading(false)
    }
  }

  const loadHiringProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/hiring-spa/status/${companyId}`)
      if (res.ok) {
        const { profile } = await res.json()
        setHiringProfile(profile)
        if (profile?.status === 'crawling') {
          setCrawling(true)
        } else {
          setCrawling(false)
          // Stop polling if we were polling
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        }
      }
    } catch {
      // Silently fail — not critical
    }
  }, [companyId])

  useEffect(() => {
    loadHiringProfile()
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [loadHiringProfile])

  async function handleStartCrawl() {
    setCrawling(true)
    setError('')

    try {
      const res = await fetch('/api/admin/hiring-spa/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start crawl')
      }

      // Start polling for status
      pollRef.current = setInterval(loadHiringProfile, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crawl failed')
      setCrawling(false)
    }
  }

  // ATS functions
  const loadAtsConnection = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/hiring-spa/ats?companyId=${companyId}`)
      if (res.ok) {
        const { connection } = await res.json()
        setAtsConnection(connection)
      }
    } catch {
      // Non-critical
    }
  }, [companyId])

  useEffect(() => {
    if (hasHiringSpaAccess) {
      loadAtsConnection()
    }
    return () => {
      if (atsSyncPollRef.current) {
        clearInterval(atsSyncPollRef.current)
      }
    }
  }, [hasHiringSpaAccess, loadAtsConnection])

  async function handleAtsTest() {
    if (!atsApiKey.trim()) return
    setAtsTesting(true)
    setAtsTestResult(null)
    try {
      const res = await fetch('/api/admin/hiring-spa/ats/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: atsApiKey }),
      })
      if (res.ok) {
        const { valid } = await res.json()
        setAtsTestResult(valid)
      } else {
        setAtsTestResult(false)
      }
    } catch {
      setAtsTestResult(false)
    } finally {
      setAtsTesting(false)
    }
  }

  async function handleAtsSave() {
    if (!atsApiKey.trim()) return
    setAtsSaving(true)
    try {
      const res = await fetch('/api/admin/hiring-spa/ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, provider: 'greenhouse', apiKey: atsApiKey }),
      })
      if (res.ok) {
        setAtsApiKey('')
        setAtsTestResult(null)
        await loadAtsConnection()
      }
    } catch {
      setError('Failed to save ATS connection')
    } finally {
      setAtsSaving(false)
    }
  }

  async function handleAtsDelete() {
    try {
      await fetch('/api/admin/hiring-spa/ats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, provider: 'greenhouse' }),
      })
      setAtsConnection(null)
      setAtsApiKey('')
      setAtsTestResult(null)
    } catch {
      setError('Failed to remove ATS connection')
    }
  }

  async function handleAtsSync() {
    setAtsSyncing(true)
    try {
      const res = await fetch('/api/admin/hiring-spa/ats/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Sync failed')
      }

      // Poll for completion — check every 3s, stop after 60s
      const startSyncAt = atsConnection?.last_sync_at
      let elapsed = 0
      atsSyncPollRef.current = setInterval(async () => {
        elapsed += 3000
        if (elapsed > 60000) {
          if (atsSyncPollRef.current) {
            clearInterval(atsSyncPollRef.current)
            atsSyncPollRef.current = null
          }
          setAtsSyncing(false)
          return
        }
        try {
          const pollRes = await fetch(`/api/admin/hiring-spa/ats?companyId=${companyId}`)
          if (pollRes.ok) {
            const { connection } = await pollRes.json()
            if (connection && connection.last_sync_at !== startSyncAt) {
              setAtsConnection(connection)
              setAtsSyncing(false)
              if (atsSyncPollRef.current) {
                clearInterval(atsSyncPollRef.current)
                atsSyncPollRef.current = null
              }
            }
          }
        } catch {
          // Keep polling
        }
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      setAtsSyncing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company_name: companyName.trim() || null,
          company_linkedin: companyLinkedin.trim() || null,
          company_stage: companyStage || null,
          newsletter_optin: newsletterOptin,
          has_hiring_spa_access: hasHiringSpaAccess,
          website_url: websiteUrl.trim() || null,
          github_org: githubOrg.trim() || null,
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
          Company Detail
        </h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Close
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-detail-body">
        {/* Read-only info */}
        {company && (
          <div className="admin-detail-section">
            <div className="section-label">Info</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
              <strong>Joined:</strong> {new Date(company.created_at).toLocaleDateString()}
            </p>
            {company.hubspot_contact_id && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
                <strong>HubSpot Contact:</strong> {company.hubspot_contact_id}
              </p>
            )}
            {company.hubspot_company_id && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
                <strong>HubSpot Company:</strong> {company.hubspot_company_id}
              </p>
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="admin-detail-section">
          <div className="section-label">Edit</div>
          <div className="form-group">
            <label htmlFor="co-company-name" style={labelStyle}>Company Name</label>
            <input
              id="co-company-name"
              type="text"
              className="form-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-name" style={labelStyle}>Contact Name</label>
            <input
              id="co-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-linkedin" style={labelStyle}>Company LinkedIn URL</label>
            <input
              id="co-linkedin"
              type="url"
              className="form-input"
              value={companyLinkedin}
              onChange={(e) => setCompanyLinkedin(e.target.value)}
              placeholder="https://linkedin.com/company/..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-stage" style={labelStyle}>Company Stage</label>
            <select
              id="co-stage"
              className="form-select"
              value={companyStage}
              onChange={(e) => setCompanyStage(e.target.value)}
            >
              <option value="">Select stage...</option>
              {COMPANY_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={newsletterOptin}
                onChange={(e) => setNewsletterOptin(e.target.checked)}
              />
              <span>Newsletter Opt-in</span>
            </label>
          </div>
        </div>

        {/* Hiring Spa section */}
        <div className="admin-detail-section">
          <div className="section-label">Hiring Spa</div>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={hasHiringSpaAccess}
                onChange={(e) => setHasHiringSpaAccess(e.target.checked)}
              />
              <span>Hiring Spa Access</span>
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="co-website-url" style={labelStyle}>Website URL</label>
            <input
              id="co-website-url"
              type="url"
              className="form-input"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="co-github-org" style={labelStyle}>GitHub Organization</label>
            <input
              id="co-github-org"
              type="text"
              className="form-input"
              value={githubOrg}
              onChange={(e) => setGithubOrg(e.target.value)}
              placeholder="my-github-org"
            />
          </div>

          {hasHiringSpaAccess && websiteUrl.trim() && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <button
                className="btn-secondary"
                onClick={handleStartCrawl}
                disabled={crawling}
                style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}
              >
                {crawling ? 'Crawling...' : hiringProfile ? 'Re-crawl' : 'Start Crawl'}
              </button>

              {hiringProfile && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                  <p style={{ color: 'var(--color-slate)' }}>
                    <strong>Status:</strong>{' '}
                    <span style={{
                      color: hiringProfile.status === 'questionnaire' || hiringProfile.status === 'complete'
                        ? 'var(--color-emerald)'
                        : hiringProfile.crawl_error
                          ? 'var(--color-coral)'
                          : 'var(--color-slate)'
                    }}>
                      {hiringProfile.status}
                    </span>
                  </p>
                  {hiringProfile.crawl_error && (
                    <p style={{ color: 'var(--color-coral)', marginTop: 'var(--space-1)' }}>
                      <strong>Error:</strong> {hiringProfile.crawl_error}
                    </p>
                  )}
                  {hiringProfile.crawl_completed_at && (
                    <p style={{ color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
                      <strong>Completed:</strong> {new Date(hiringProfile.crawl_completed_at).toLocaleString()}
                    </p>
                  )}
                  {hiringProfile.company_dna && (
                    <p style={{ color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
                      <strong>Industry:</strong> {(hiringProfile.company_dna as { industry?: string }).industry || 'N/A'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Greenhouse Integration */}
          {hasHiringSpaAccess && (
            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Greenhouse Integration
              </div>

              {atsConnection && (
                <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-1)' }}>
                    <strong>API Key:</strong> {atsConnection.api_key}
                    <button
                      onClick={handleAtsDelete}
                      style={{
                        marginLeft: 'var(--space-2)',
                        color: 'var(--color-coral)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        textDecoration: 'underline',
                      }}
                    >
                      Remove
                    </button>
                  </p>
                  {atsConnection.last_sync_at && (
                    <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-1)' }}>
                      <strong>Last Sync:</strong> {new Date(atsConnection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                  {atsConnection.last_sync_role_count != null && (
                    <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-1)' }}>
                      <strong>Roles Synced:</strong> {atsConnection.last_sync_role_count}
                    </p>
                  )}
                  {atsConnection.last_sync_error && (
                    <p style={{ color: 'var(--color-coral)', marginBottom: 'var(--space-1)' }}>
                      <strong>Sync Error:</strong> {atsConnection.last_sync_error}
                    </p>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={handleAtsSync}
                    disabled={atsSyncing}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', marginTop: 'var(--space-1)' }}
                  >
                    {atsSyncing ? 'Syncing...' : 'Sync Roles'}
                  </button>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="co-ats-key" style={labelStyle}>
                  {atsConnection ? 'Update API Key' : 'Greenhouse API Key'}
                </label>
                <input
                  id="co-ats-key"
                  type="password"
                  className="form-input"
                  value={atsApiKey}
                  onChange={(e) => { setAtsApiKey(e.target.value); setAtsTestResult(null) }}
                  placeholder="Harvest API key"
                />
              </div>

              {atsApiKey.trim() && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                  <button
                    className="btn-secondary"
                    onClick={handleAtsTest}
                    disabled={atsTesting}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}
                  >
                    {atsTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleAtsSave}
                    disabled={atsSaving || atsTestResult === false}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}
                  >
                    {atsSaving ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
              )}

              {atsTestResult !== null && (
                <p style={{
                  fontSize: 'var(--text-sm)',
                  marginTop: 'var(--space-1)',
                  color: atsTestResult ? 'var(--color-emerald)' : 'var(--color-coral)',
                }}>
                  {atsTestResult ? 'Connection successful' : 'Connection failed — check your API key'}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
