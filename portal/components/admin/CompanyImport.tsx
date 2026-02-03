'use client'

import { useState, useRef } from 'react'

interface ImportRow {
  email: string
  name: string
  company_linkedin: string
  company_stage: string
  valid: boolean
  error?: string
}

interface ImportResult {
  created: number
  skipped: number
  failed: number
  details: { email: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[]
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })
    return row
  })
}

const VALID_STAGES = ['bootstrapped', 'angel', 'pre-seed', 'seed', 'bigger']

function validateRow(row: Record<string, string>): ImportRow {
  const email = row.email || ''
  const name = row.name || ''
  const company_linkedin = row.company_linkedin || ''
  const company_stage = row.company_stage || ''

  const errors: string[] = []
  if (!email || !email.includes('@')) errors.push('Invalid email')
  if (!name) errors.push('Name required')
  if (!company_linkedin) errors.push('LinkedIn required')
  if (!VALID_STAGES.includes(company_stage)) errors.push('Invalid stage')

  return {
    email,
    name,
    company_linkedin,
    company_stage,
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

export default function CompanyImport() {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [sendWelcome, setSendWelcome] = useState(true)
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
        setError('No data rows found. Ensure CSV has headers: email, name, company_linkedin, company_stage')
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
    a.download = 'import-results.csv'
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
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            email: r.email,
            name: r.name,
            company_linkedin: r.company_linkedin,
            company_stage: r.company_stage,
          })),
          send_welcome: sendWelcome,
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
    <div className="window" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="window-title">Bulk Import Companies</div>
      <div className="window-content">
        <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-5)' }}>
          Upload a CSV with columns: <strong>email, name, company_linkedin, company_stage</strong>
        </p>
        <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)', fontSize: 'var(--text-sm)' }}>
          Valid stages: bootstrapped, angel, pre-seed, seed, bigger
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="csv-file">CSV File</label>
          <input
            ref={fileRef}
            id="csv-file"
            type="file"
            accept=".csv"
            className="form-input"
            onChange={handleFileUpload}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <label className="form-checkbox">
            <input type="checkbox" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
            <span>Send welcome emails</span>
          </label>
          <label className="form-checkbox">
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            <span>Skip duplicates silently</span>
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
                    <th>Email</th>
                    <th>Name</th>
                    <th>LinkedIn</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'admin-row-error'}>
                      <td>{row.valid ? 'OK' : row.error}</td>
                      <td>{row.email}</td>
                      <td>{row.name}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.company_linkedin}</td>
                      <td>{row.company_stage}</td>
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
              {importing ? 'Importing...' : `Import ${validCount} Companies`}
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
