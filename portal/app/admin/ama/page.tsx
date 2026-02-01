'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

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

export default function AdminAmaPage() {
  const [submissions, setSubmissions] = useState<AmaSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ama')
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions)
      }
    } catch (e) {
      console.error('Failed to load AMA submissions:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const filtered = useMemo(() => {
    let result = submissions
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.twitter.toLowerCase().includes(q)
      )
    }
    if (tagFilter) {
      result = result.filter((s) => s.tag_preference === tagFilter)
    }
    return result
  }, [submissions, search, tagFilter])

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) || null,
    [submissions, selectedId]
  )

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">AMA Submissions</h1>
        </div>

        <div className="admin-filters">
          <input
            type="text"
            className="form-input"
            placeholder="Search name, email, or twitter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <select
            className="form-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="">All Preferences</option>
            <option value="tag-me">Tag Me</option>
            <option value="keep-anon">Keep Anon</option>
          </select>
        </div>

        <div className={selectedId ? 'admin-split-layout' : ''}>
          <div className={selectedId ? 'admin-split-main' : ''}>
            <div className="window">
              <div className="window-title">
                Submissions ({loading ? '...' : filtered.length})
              </div>
              <div style={{ padding: 0 }}>
                {loading ? (
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
                        {filtered.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                            className={selectedId === s.id ? 'admin-row-selected' : ''}
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

          {selected && (
            <div className="admin-split-detail">
              <div className="window">
                <div className="window-title">Submission Detail</div>
                <div className="admin-detail-panel">
                  <div className="admin-detail-header">
                    <h3>{selected.name}</h3>
                    <button className="btn-secondary" onClick={() => setSelectedId(null)}>
                      Close
                    </button>
                  </div>
                  <div className="admin-detail-body">
                    <div className="admin-detail-section">
                      <div className="section-label">Contact</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Email</div>
                          <div>{selected.email}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Twitter</div>
                          <div>{selected.twitter}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Phone</div>
                          <div>{selected.phone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Tag Preference</div>
                          <div><span className="admin-flag">{selected.tag_preference}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-detail-section">
                      <div className="section-label">Context</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selected.context}</div>
                    </div>
                    <div className="admin-detail-section">
                      <div className="section-label">Question</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selected.question}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-mid)' }}>
                      Submitted {new Date(selected.created_at).toLocaleString()}
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
