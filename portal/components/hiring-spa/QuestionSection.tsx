'use client'

import { useState } from 'react'

interface QuestionSectionProps {
  title: string
  description: string
  sectionId: string
  isSaved: boolean
  onSave: () => Promise<void>
  children: React.ReactNode
}

export default function QuestionSection({
  title,
  description,
  sectionId,
  isSaved,
  onSave,
  children,
}: QuestionSectionProps) {
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      await onSave()
      setSaveMessage('Saved')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Error saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="spa-section" id={`section-${sectionId}`}>
      <div className="spa-section-header">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="spa-heading-1">{title}</h2>
          {isSaved && (
            <span className="spa-badge spa-badge-success">Saved</span>
          )}
        </div>
        <p className="spa-body-muted" style={{ marginTop: 8 }}>{description}</p>
      </div>

      {children}

      <div className="spa-section-save-row">
        <button
          className="spa-btn spa-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : `Save ${title}`}
        </button>
        {saveMessage && (
          <span className="spa-save-status">{saveMessage}</span>
        )}
      </div>
    </section>
  )
}
