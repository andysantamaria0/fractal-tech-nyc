'use client'

import { useState, useRef } from 'react'

interface ImportRow {
  name: string
  email: string
  github_url: string
  github_username?: string
  focus_areas?: string[]
  what_excites_you?: string
  availability_start?: string
  availability_hours_per_week?: number
  availability_duration_weeks?: number
  linkedin_url?: string
  portfolio_url?: string
  photo_url?: string
  cohort?: string
  is_available_for_cycles?: boolean
  valid: boolean
  error?: string
}

interface ImportResult {
  created: number
  skipped: number
  failed: number
  details: { email: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[]
}

/**
 * Parse a full CSV text into rows, handling multiline quoted fields correctly.
 * Google Sheets exports can have newlines inside quoted cells (including headers).
 */
function parseCSV(text: string): Record<string, string>[] {
  const input = text.replace(/^\uFEFF/, '') // strip BOM
  const records: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        current.push(field.trim())
        field = ''
      } else if (char === '\n' || (char === '\r' && input[i + 1] === '\n')) {
        if (char === '\r') i++ // skip \r in \r\n
        current.push(field.trim())
        field = ''
        if (current.some((c) => c !== '')) {
          records.push(current)
        }
        current = []
      } else {
        field += char
      }
    }
  }
  // Last field/record
  current.push(field.trim())
  if (current.some((c) => c !== '')) {
    records.push(current)
  }

  if (records.length < 2) return []

  const headers = records[0].map((h) => {
    // Take only the first line of multiline headers, normalize to snake_case
    const firstLine = h.split('\n')[0].trim()
    return firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  })

  return records.slice(1).map((values) => {
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })
    return row
  })
}

/**
 * Map common alternate CSV column names to the engineer field names.
 * This lets us accept Google Sheets exports with headers like "Full name", "Github", etc.
 */
const COLUMN_ALIASES: Record<string, string> = {
  'full_name': 'name',
  'github': 'github_url',
  'linkedin': 'linkedin_url',
  'photo_url': 'photo_url',
  'photo': 'photo_url',
  'goals_interests': 'what_excites_you',
  'twitter': '_twitter', // keep for reference but not an engineer field
  'cohort': 'cohort',
}

function applyColumnAliases(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const alias = COLUMN_ALIASES[key]
    if (alias) {
      mapped[alias] = value
    }
    // Always keep original key too (so exact matches like "email" still work)
    mapped[key] = mapped[key] || value
  }
  return mapped
}

/**
 * Normalize a GitHub value that might be a username, a URL without protocol,
 * or a full URL into a proper https://github.com/... URL.
 */
function normalizeGithubUrl(value: string): string {
  if (!value) return ''
  // Already a full URL
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  // URL without protocol
  if (value.startsWith('github.com/')) return `https://${value}`
  // Just a username (no slashes)
  if (!value.includes('/') && !value.includes('.')) return `https://github.com/${value}`
  return value
}

function normalizeLinkedinUrl(value: string): string {
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('www.') || value.startsWith('linkedin.com')) return `https://${value}`
  return value
}

function validateRow(rawRow: Record<string, string>): ImportRow {
  const row = applyColumnAliases(rawRow)

  const name = row.name || ''
  const email = row.email || ''
  const github_url = normalizeGithubUrl(row.github_url || '')

  const errors: string[] = []
  if (!name) errors.push('Name required')
  if (!email || !email.includes('@')) errors.push('Invalid email')
  if (!github_url) errors.push('GitHub URL required')

  // Parse focus_areas: comma-separated string → array
  const focus_areas = row.focus_areas
    ? row.focus_areas.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined

  // Parse booleans
  const is_available_for_cycles = row.is_available_for_cycles
    ? row.is_available_for_cycles.toLowerCase() === 'true'
    : undefined

  // Parse integers
  const availability_hours_per_week = row.availability_hours_per_week
    ? parseInt(row.availability_hours_per_week, 10) || undefined
    : undefined
  const availability_duration_weeks = row.availability_duration_weeks
    ? parseInt(row.availability_duration_weeks, 10) || undefined
    : undefined

  // Extract github username from URL
  const github_username = row.github_username || extractGithubUsername(github_url)

  const linkedin_url = normalizeLinkedinUrl(row.linkedin_url || '')

  return {
    name,
    email,
    github_url,
    github_username: github_username || undefined,
    focus_areas,
    what_excites_you: row.what_excites_you || undefined,
    availability_start: row.availability_start || undefined,
    availability_hours_per_week,
    availability_duration_weeks,
    linkedin_url: linkedin_url || undefined,
    portfolio_url: row.portfolio_url || undefined,
    photo_url: row.photo_url || undefined,
    cohort: row.cohort || undefined,
    is_available_for_cycles,
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

function extractGithubUsername(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    return parts[0] || ''
  } catch {
    return ''
  }
}

export default function EngineerImport({ onImported }: { onImported?: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('No data rows found. Ensure CSV has a header row with at least: name/Full name, email, github/Github')
        return
      }
      setRows(parsed.map(validateRow))
    }
    reader.readAsText(file)
  }

  function downloadResultsCSV(details: ImportResult['details']) {
    const header = 'email,status,reason'
    const csvRows = details.map((d) =>
      `"${d.email}","${d.status}","${(d.reason || '').replace(/"/g, '""')}"`
    )
    const csv = [header, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'engineer-import-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.valid)
    if (validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    setImporting(true)
    setProgress(0)
    setError('')

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 90))
    }, 300)

    try {
      const res = await fetch('/api/admin/engineers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows.map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { valid, error, ...data } = r
            return data
          }),
          skip_duplicates: skipDuplicates,
        }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data: ImportResult = await res.json()
      setResult(data)
      setProgress(100)

      if (data.created > 0 && onImported) {
        onImported()
      }
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter((r) => r.valid).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <div className="window" style={{ maxWidth: 900 }}>
      <div className="window-title">Bulk Import Engineers</div>
      <div className="window-content">
        <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-5)' }}>
          Upload a CSV exported from Google Sheets. Recognized columns:
          <strong> Full name</strong> (or name), <strong>Email</strong>, <strong>Github</strong> (or github_url).
          Also accepts: LinkedIn, Photo (URL), Goals/Interests, focus_areas, and other engineer fields.
        </p>
        <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)', fontSize: 'var(--text-sm)' }}>
          Extra columns are ignored. GitHub usernames are auto-expanded to full URLs.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="engineer-csv-file">CSV File</label>
          <input
            ref={fileRef}
            id="engineer-csv-file"
            type="file"
            accept=".csv"
            className="form-input"
            onChange={handleFileUpload}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <label className="form-checkbox">
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            <span>Skip duplicates (by email)</span>
          </label>
        </div>

        {rows.length > 0 && !result && (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div className="cohort-stat">{rows.length} Total</div>
              <div className="cohort-stat" style={{ borderColor: '#34D399' }}>{validCount} Valid</div>
              {invalidCount > 0 && (
                <div className="cohort-stat" style={{ borderColor: 'var(--color-error)' }}>{invalidCount} Invalid</div>
              )}
            </div>

            <div className="admin-table-wrapper" style={{ marginBottom: 'var(--space-6)' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>GitHub URL</th>
                    <th>LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'admin-row-error'}>
                      <td>{row.valid ? 'OK' : row.error}</td>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.github_url}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.linkedin_url || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="admin-progress" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="admin-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button
              className="btn-primary btn-full"
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing ? 'Importing...' : `Import ${validCount} Engineers`}
            </button>
          </>
        )}

        {result && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <div className="alert alert-success">
              Import complete: {result.created} created, {result.skipped} skipped, {result.failed} failed
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((d, i) => (
                    <tr key={i} className={d.status === 'failed' ? 'admin-row-error' : ''}>
                      <td>{d.email}</td>
                      <td style={{ textTransform: 'uppercase', fontWeight: 700 }}>{d.status}</td>
                      <td>{d.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
              <button
                className="btn-secondary"
                onClick={() => downloadResultsCSV(result.details)}
              >
                Download Results CSV
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setRows([])
                  setResult(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
