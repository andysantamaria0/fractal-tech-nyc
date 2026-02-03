'use client'

import { useState, useCallback } from 'react'
import type { BeautifiedJD, JDFeedback, RequirementFeedback, ProseSectionFeedback } from '@/lib/hiring-spa/types'

const EMPTY_FEEDBACK: JDFeedback = {
  requirements: {},
  team_context: { sentiment: null },
  working_vibe: { sentiment: null },
  culture_check: { sentiment: null },
}

interface Props {
  jd: BeautifiedJD
  feedback: JDFeedback | null
  onFeedbackChange: (feedback: JDFeedback) => void
  onRegenerate: () => void
  onConfirm: () => void
  regenerating: boolean
}

export default function InteractiveJDView({ jd, feedback, onFeedbackChange, onRegenerate, onConfirm, regenerating }: Props) {
  const fb = feedback ?? EMPTY_FEEDBACK
  const [editingNote, setEditingNote] = useState<string | null>(null)

  const hasAnyFeedback = (() => {
    for (const key of Object.keys(fb.requirements)) {
      const r = fb.requirements[Number(key)]
      if (r && (r.status !== null || r.note)) return true
    }
    for (const section of ['team_context', 'working_vibe', 'culture_check'] as const) {
      if (fb[section].sentiment !== null || fb[section].note) return true
    }
    return false
  })()

  const updateRequirement = useCallback((index: number, update: Partial<RequirementFeedback>) => {
    const current = fb.requirements[index] ?? { status: null }
    const updated: JDFeedback = {
      ...fb,
      requirements: {
        ...fb.requirements,
        [index]: { ...current, ...update },
      },
    }
    onFeedbackChange(updated)
  }, [fb, onFeedbackChange])

  const updateProseSection = useCallback((section: 'team_context' | 'working_vibe' | 'culture_check', update: Partial<ProseSectionFeedback>) => {
    const current = fb[section]
    const updated: JDFeedback = {
      ...fb,
      [section]: { ...current, ...update },
    }
    onFeedbackChange(updated)
  }, [fb, onFeedbackChange])

  const essential = jd.requirements.filter(r => r.category === 'essential')
  const niceToHave = jd.requirements.filter(r => r.category === 'nice_to_have')

  const renderRequirement = (req: typeof jd.requirements[0], globalIndex: number) => {
    const reqFb = fb.requirements[globalIndex] ?? { status: null }
    const isConfirmed = reqFb.status === 'confirmed'
    const isRejected = reqFb.status === 'rejected'
    const noteKey = `req-${globalIndex}`
    const isEditingNote = editingNote === noteKey

    let reqClass = 'spa-jd-requirement'
    if (req.category === 'essential') reqClass += ' spa-jd-requirement-essential'
    else reqClass += ' spa-jd-requirement-nice'
    if (isConfirmed) reqClass += ' spa-jd-req-confirmed'
    if (isRejected) reqClass += ' spa-jd-req-rejected'

    return (
      <li key={globalIndex} className={reqClass}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <p className="spa-jd-requirement-text">{req.text}</p>
            {req.caveat && <p className="spa-jd-requirement-caveat">{req.caveat}</p>}
          </div>
          <div className="spa-jd-req-actions">
            <button
              className={`spa-jd-action-btn ${isConfirmed ? 'spa-jd-action-active' : ''}`}
              title="Confirm"
              onClick={() => updateRequirement(globalIndex, { status: isConfirmed ? null : 'confirmed' })}
            >
              &#x2713;
            </button>
            <button
              className={`spa-jd-action-btn ${isRejected ? 'spa-jd-action-active-reject' : ''}`}
              title="Reject"
              onClick={() => updateRequirement(globalIndex, { status: isRejected ? null : 'rejected' })}
            >
              &#x2717;
            </button>
            <button
              className="spa-jd-action-btn"
              title="Add note"
              onClick={() => setEditingNote(isEditingNote ? null : noteKey)}
            >
              &#x270E;
            </button>
          </div>
        </div>
        {isEditingNote && (
          <textarea
            className="spa-textarea"
            placeholder="Add a note about this requirement..."
            value={reqFb.note ?? ''}
            onChange={e => updateRequirement(globalIndex, { note: e.target.value || undefined })}
            style={{ marginTop: 8, minHeight: 60 }}
          />
        )}
        {!isEditingNote && reqFb.note && (
          <div className="spa-jd-note-display">{reqFb.note}</div>
        )}
      </li>
    )
  }

  const renderProseSection = (title: string, text: string, sectionKey: 'team_context' | 'working_vibe' | 'culture_check') => {
    const sectionFb = fb[sectionKey]
    const noteKey = `prose-${sectionKey}`
    const isEditingNote = editingNote === noteKey

    return (
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">{title}</h3>
        <p className="spa-jd-prose">{text}</p>
        <div className="spa-jd-prose-actions">
          <button
            className={`spa-jd-action-btn ${sectionFb.sentiment === 'positive' ? 'spa-jd-action-active' : ''}`}
            title="Thumbs up"
            onClick={() => updateProseSection(sectionKey, { sentiment: sectionFb.sentiment === 'positive' ? null : 'positive' })}
          >
            &#x1F44D;
          </button>
          <button
            className={`spa-jd-action-btn ${sectionFb.sentiment === 'negative' ? 'spa-jd-action-active-reject' : ''}`}
            title="Thumbs down"
            onClick={() => updateProseSection(sectionKey, { sentiment: sectionFb.sentiment === 'negative' ? null : 'negative' })}
          >
            &#x1F44E;
          </button>
          <button
            className="spa-jd-action-btn"
            title="Add note"
            onClick={() => setEditingNote(isEditingNote ? null : noteKey)}
          >
            &#x270E;
          </button>
        </div>
        {isEditingNote && (
          <textarea
            className="spa-textarea"
            placeholder={`Add a note about ${title.toLowerCase()}...`}
            value={sectionFb.note ?? ''}
            onChange={e => updateProseSection(sectionKey, { note: e.target.value || undefined })}
            style={{ marginTop: 8, minHeight: 60 }}
          />
        )}
        {!isEditingNote && sectionFb.note && (
          <div className="spa-jd-note-display">{sectionFb.note}</div>
        )}
      </div>
    )
  }

  // Global indices: essentials 0..N-1, nice-to-have N..M-1
  const niceStartIndex = essential.length

  return (
    <div>
      {/* Review hint */}
      <div className="spa-jd-review-hint">
        We assume everything looks good. Only mark items that need changes.
      </div>

      {/* Requirements */}
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">What You Need</h3>
        {essential.length > 0 && (
          <>
            <span className="spa-jd-category-label">Essential</span>
            <ul className="spa-jd-requirements">
              {essential.map((req, i) => renderRequirement(req, i))}
            </ul>
          </>
        )}
        {niceToHave.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <span className="spa-jd-category-label">Nice to Have</span>
            <ul className="spa-jd-requirements">
              {niceToHave.map((req, i) => renderRequirement(req, niceStartIndex + i))}
            </ul>
          </div>
        )}
      </div>

      {renderProseSection('The Team', jd.team_context, 'team_context')}
      {renderProseSection('Day to Day', jd.working_vibe, 'working_vibe')}
      {renderProseSection('Culture Check', jd.culture_check, 'culture_check')}

      {/* Action area */}
      <div className="spa-jd-regenerate">
        {hasAnyFeedback ? (
          <>
            <button
              className="spa-btn spa-btn-primary"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              {regenerating ? 'Re-generating...' : 'Re-generate with your feedback'}
            </button>
            <button
              className="spa-btn spa-btn-secondary"
              onClick={onConfirm}
              disabled={regenerating}
            >
              Skip — Continue as-is
            </button>
          </>
        ) : (
          <button
            className="spa-btn spa-btn-primary"
            onClick={onConfirm}
          >
            Looks Good, Continue
          </button>
        )}
      </div>
    </div>
  )
}
