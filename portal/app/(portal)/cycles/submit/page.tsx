'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/posthog'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Engineer {
  id: string
  name: string
}

interface UploadedFile {
  name: string
  url: string
  size: number
}

const TIMELINE_OPTIONS = [
  { value: 'no-rush', label: 'No Rush' },
  { value: '2-weeks', label: '2 Weeks' },
  { value: '1-month', label: '1 Month' },
  { value: 'urgent', label: 'Urgent' },
]

const HIRING_OPTIONS = [
  { value: 'interns', label: 'Yes, Interns' },
  { value: 'contract', label: 'Yes, Contract' },
  { value: 'full-time', label: 'Yes, Full-Time' },
  { value: 'no', label: 'No' },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SubmitFeaturePage() {
  const searchParams = useSearchParams()
  const preselectedEngineer = searchParams.get('engineer')
  const emailFromUrl = searchParams.get('email')

  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [email, setEmail] = useState(emailFromUrl || '')
  const [companyName, setCompanyName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeline, setTimeline] = useState('')
  const [techStack, setTechStack] = useState('')
  const [preferredEngineerId, setPreferredEngineerId] = useState(preselectedEngineer || '')
  const [hiringSelections, setHiringSelections] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    trackEvent('feature_submission_started', {
      engineer_id: preselectedEngineer || undefined,
    })

    async function loadData() {
      // Load engineers
      const { data: engData } = await supabase
        .from('engineers')
        .select('id, name')
        .eq('is_available_for_cycles', true)
        .order('name')

      if (engData) setEngineers(engData)

      // Load user profile to pre-fill email and company name
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, company_name')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          if (!emailFromUrl && profile.email) setEmail(profile.email)
          if (profile.company_name) setCompanyName(profile.company_name)
        }
      }
    }
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleHiringToggle(value: string) {
    if (value === 'no') {
      setHiringSelections((prev) => prev.includes('no') ? [] : ['no'])
    } else {
      setHiringSelections((prev) => {
        const without = prev.filter((v) => v !== 'no')
        return without.includes(value)
          ? without.filter((v) => v !== value)
          : [...without, value]
      })
    }
  }

  const isHiring = hiringSelections.length > 0 && !hiringSelections.includes('no')
  const hiringTypes = hiringSelections.filter((v) => v !== 'no')

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    if (uploadedFiles.length + fileArray.length > MAX_FILES) {
      setFieldErrors((prev) => ({ ...prev, files: `Maximum ${MAX_FILES} files allowed` }))
      return
    }

    const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setFieldErrors((prev) => ({ ...prev, files: `${oversized.name} exceeds 10MB limit` }))
      return
    }

    setUploading(true)
    setFieldErrors((prev) => ({ ...prev, files: '' }))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newFiles: UploadedFile[] = []

      for (const file of fileArray) {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/${timestamp}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('submission-attachments')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('submission-attachments')
          .getPublicUrl(path)

        newFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
        })
      }

      setUploadedFiles((prev) => [...prev, ...newFiles])
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        files: err instanceof Error ? err.message : 'Upload failed',
      }))
    } finally {
      setUploading(false)
    }
  }, [uploadedFiles.length, supabase])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required'
    else if (title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
    if (!description.trim()) errors.description = 'Description is required'
    else if (description.trim().length < 20) errors.description = 'Please provide more detail (at least 20 characters)'
    if (!timeline) errors.timeline = 'Please select a timeline'
    if (hiringSelections.length === 0) errors.hiring = 'Please indicate your hiring status'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          timeline,
          tech_stack: techStack || null,
          preferred_engineer_id: preferredEngineerId || null,
          is_hiring: isHiring,
          hiring_types: hiringTypes,
          company_name: companyName || null,
          attachment_urls: uploadedFiles.map((f) => f.url),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      trackEvent('feature_submission_completed', {
        engineer_id: preferredEngineerId || undefined,
        timeline,
        hiring_status: isHiring,
        attachment_count: uploadedFiles.length,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="dashboard">
        <div className="window" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="window-title">Submission Received</div>
          <div className="window-content" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              Your feature request has been submitted.
            </p>
            <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
              Our team will review it and match you with an engineer. You&apos;ll hear from us soon.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="btn-primary">
                Back to Dashboard
              </Link>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSubmitted(false)
                  setTitle('')
                  setDescription('')
                  setTimeline('')
                  setTechStack('')
                  setPreferredEngineerId('')
                  setHiringSelections([])
                  setUploadedFiles([])
                }}
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="window" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="window-title">Submit Feature Request</div>
        <div className="window-content">
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Tell us about a feature or project you&apos;d like one of our engineers to build.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Email (pre-populated) */}
            <div className="form-group">
              <label htmlFor="email">Your Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ opacity: 0.7 }}
                readOnly
              />
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                type="text"
                className="form-input"
                placeholder="e.g. Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className={`form-group ${fieldErrors.title ? 'error' : ''}`}>
              <label htmlFor="title">Feature Title *</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="e.g. Build a Stripe integration"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => ({ ...prev, title: '' })) }}
                required
              />
              {fieldErrors.title && <div className="form-error">{fieldErrors.title}</div>}
            </div>

            <div className={`form-group ${fieldErrors.description ? 'error' : ''}`}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                className="form-input"
                placeholder="Describe the feature, goals, and any requirements..."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors((prev) => ({ ...prev, description: '' })) }}
                required
                rows={5}
                style={{ resize: 'vertical' }}
              />
              {fieldErrors.description && <div className="form-error">{fieldErrors.description}</div>}
            </div>

            <div className={`form-group ${fieldErrors.timeline ? 'error' : ''}`}>
              <label htmlFor="timeline">Timeline *</label>
              <select
                id="timeline"
                className="form-select"
                value={timeline}
                onChange={(e) => { setTimeline(e.target.value); setFieldErrors((prev) => ({ ...prev, timeline: '' })) }}
                required
              >
                <option value="">Select timeline...</option>
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.timeline && <div className="form-error">{fieldErrors.timeline}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="techStack">Tech Stack</label>
              <input
                id="techStack"
                type="text"
                className="form-input"
                placeholder="e.g. React, Node.js, PostgreSQL"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="engineer">Preferred Engineer</label>
              <select
                id="engineer"
                className="form-select"
                value={preferredEngineerId}
                onChange={(e) => setPreferredEngineerId(e.target.value)}
              >
                <option value="">No preference</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`form-group ${fieldErrors.hiring ? 'error' : ''}`}>
              <label>Is your company hiring? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {HIRING_OPTIONS.map((opt) => (
                  <label key={opt.value} className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={hiringSelections.includes(opt.value)}
                      onChange={() => { handleHiringToggle(opt.value); setFieldErrors((prev) => ({ ...prev, hiring: '' })) }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.hiring && <div className="form-error">{fieldErrors.hiring}</div>}
            </div>

            {/* File Upload Drop Zone */}
            <div className={`form-group ${fieldErrors.files ? 'error' : ''}`}>
              <label>Attachments</label>
              <p style={{ color: 'var(--color-slate)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                Drop files here or click to upload (specs, mockups, docs — max {MAX_FILES} files, 10MB each)
              </p>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-charcoal)' : 'var(--color-border, #ccc)'}`,
                  borderRadius: 8,
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(e.target.files)
                      e.target.value = ''
                    }
                  }}
                />
                {uploading ? (
                  <span style={{ color: 'var(--color-slate)' }}>Uploading...</span>
                ) : (
                  <span style={{ color: 'var(--color-slate)' }}>
                    Drop files here or click to browse
                  </span>
                )}
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        backgroundColor: 'var(--color-surface, #f9f9f9)',
                        borderRadius: 4,
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 'var(--space-3)' }}>
                        {file.name} <span style={{ color: 'var(--color-slate)' }}>({formatFileSize(file.size)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-slate)',
                          fontSize: 'var(--text-base)',
                          padding: '0 4px',
                          flexShrink: 0,
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {fieldErrors.files && <div className="form-error">{fieldErrors.files}</div>}
            </div>

            <button
              type="submit"
              className="btn-primary btn-full"
              disabled={loading || uploading}
            >
              {loading ? 'Submitting...' : 'Submit Feature Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
