'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import type { EngineerProfileSpa, PriorityRatings } from '@/lib/hiring-spa/types'
import { ENGINEER_SECTIONS } from '@/lib/hiring-spa/engineer-priority-questions'
import PriorityRatingsForm from './PriorityRatingsForm'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

const PRESET_LOCATIONS = ['NYC', 'SF', 'Remote'] as const

function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        width: '100%', boxSizing: 'border-box' as const,
        fontFamily: f.serif, fontSize: 15, color: c.charcoal,
        backgroundColor: c.fog, border: `1px solid ${focused ? c.honey : c.stoneLight}`,
        borderRadius: 6, padding: '12px 16px', outline: 'none',
        resize: 'vertical' as const, lineHeight: 1.6,
        transition: 'border-color 200ms ease',
        ...props.style,
      }}
    />
  )
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        fontFamily: f.serif, fontSize: 15, color: c.charcoal,
        backgroundColor: c.fog, border: `1px solid ${focused ? c.honey : c.stoneLight}`,
        borderRadius: 6, padding: '10px 14px', outline: 'none',
        transition: 'border-color 200ms ease',
        ...props.style,
      }}
    />
  )
}

interface Props {
  profile: EngineerProfileSpa
  isEditing?: boolean
}

export default function EngineerQuestionnaireForm({ profile, isEditing }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})

  const [priorities, setPriorities] = useState<PriorityRatings>(
    profile.priority_ratings || {
      work_life_balance: 3,
      culture: 3,
      mission_driven: 3,
      technical_challenges: 3,
    }
  )

  // Location state: separate preset selections from custom entries
  const existingLocations = profile.preferred_locations || []
  const existingPresets = existingLocations.filter(loc => PRESET_LOCATIONS.includes(loc as typeof PRESET_LOCATIONS[number]))
  const existingCustom = existingLocations.filter(loc => !PRESET_LOCATIONS.includes(loc as typeof PRESET_LOCATIONS[number]))

  const [selectedLocations, setSelectedLocations] = useState<string[]>(existingPresets)
  const [customLocations, setCustomLocations] = useState<string[]>(existingCustom)
  const [customLocationInput, setCustomLocationInput] = useState('')

  function toggleLocation(loc: string) {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    )
  }

  function addCustomLocation() {
    const trimmed = customLocationInput.trim()
    if (trimmed && !customLocations.includes(trimmed) && !selectedLocations.includes(trimmed)) {
      setCustomLocations(prev => [...prev, trimmed])
      setCustomLocationInput('')
    }
  }

  function removeCustomLocation(loc: string) {
    setCustomLocations(prev => prev.filter(l => l !== loc))
  }

  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {}
    for (const section of ENGINEER_SECTIONS) {
      const existing = profile[section.answersKey] as Record<string, string> | null
      initial[section.answersKey] = {}
      for (const q of section.questions) {
        initial[section.answersKey][q.id] = existing?.[q.id] || ''
      }
    }
    return initial
  })

  function updateAnswer(sectionKey: string, questionId: string, value: string) {
    setAnswers(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [questionId]: value,
      },
    }))
    // Clear section error when user types a non-empty answer
    if (value.trim()) {
      setSectionErrors(prev => {
        if (!prev[sectionKey]) return prev
        const next = { ...prev }
        delete next[sectionKey]
        return next
      })
    }
  }

  function validateSections(): boolean {
    const errors: Record<string, string> = {}
    for (const section of ENGINEER_SECTIONS) {
      const sectionAnswers = answers[section.answersKey] || {}
      const hasContent = Object.values(sectionAnswers).some(
        v => typeof v === 'string' && v.trim().length > 0
      )
      if (!hasContent) {
        errors[section.answersKey] = `Please answer at least one question in "${section.title}".`
      }
    }
    setSectionErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!validateSections()) return

    setSaving(true)

    try {
      const allLocations = [...selectedLocations, ...customLocations]
      const res = await fetch('/api/engineer/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority_ratings: priorities,
          preferred_locations: allLocations.length > 0 ? allLocations : null,
          work_preferences: answers.work_preferences,
          career_growth: answers.career_growth,
          strengths: answers.strengths,
          growth_areas: answers.growth_areas,
          deal_breakers: answers.deal_breakers,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      router.push('/engineer/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          fontFamily: f.mono, fontSize: 13, color: '#8B3A3A',
          backgroundColor: 'rgba(139, 58, 58, 0.08)', border: '1px solid rgba(139, 58, 58, 0.2)',
          borderRadius: 6, padding: '12px 16px', marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      <PriorityRatingsForm ratings={priorities} onChange={setPriorities} />

      {/* Location Preferences */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
          Location Preferences
        </h3>
        <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 16px 0', lineHeight: 1.6 }}>
          Where are you open to working? Select all that apply.
        </p>

        {/* Preset location checkboxes */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          {PRESET_LOCATIONS.map(loc => (
            <label
              key={loc}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                fontFamily: f.serif, fontSize: 15, color: c.charcoal,
              }}
            >
              <input
                type="checkbox"
                checked={selectedLocations.includes(loc)}
                onChange={() => toggleLocation(loc)}
                style={{ width: 18, height: 18, accentColor: c.honey, cursor: 'pointer' }}
              />
              {loc}
            </label>
          ))}
        </div>

        {/* Custom location chips */}
        {customLocations.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {customLocations.map(loc => (
              <span
                key={loc}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: f.mono, fontSize: 12, color: c.charcoal,
                  backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`,
                  borderRadius: 16, padding: '4px 10px',
                }}
              >
                {loc}
                <button
                  type="button"
                  onClick={() => removeCustomLocation(loc)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: c.graphite, fontSize: 14, padding: 0, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom location */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FocusInput
            type="text"
            value={customLocationInput}
            onChange={e => setCustomLocationInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomLocation() } }}
            placeholder="Add another city..."
            style={{ flex: 1, maxWidth: 240 }}
          />
          <button
            type="button"
            onClick={addCustomLocation}
            disabled={!customLocationInput.trim()}
            style={{
              fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em',
              backgroundColor: customLocationInput.trim() ? c.charcoal : c.mist,
              color: c.parchment, border: 'none', borderRadius: 4,
              padding: '10px 16px', cursor: customLocationInput.trim() ? 'pointer' : 'not-allowed',
              transition: '150ms ease',
            }}
          >
            Add
          </button>
        </div>
      </div>

      {ENGINEER_SECTIONS.map(section => (
        <div key={section.id} style={{ marginBottom: 40 }}>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
            {section.title}
          </h3>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 20px 0', lineHeight: 1.6 }}>
            {section.description}
          </p>
          {sectionErrors[section.answersKey] && (
            <div style={{
              fontFamily: f.mono, fontSize: 12, color: '#8B3A3A',
              backgroundColor: 'rgba(139, 58, 58, 0.08)', border: '1px solid rgba(139, 58, 58, 0.2)',
              borderRadius: 6, padding: '8px 12px', marginBottom: 16,
            }}>
              {sectionErrors[section.answersKey]}
            </div>
          )}
          {section.questions.map(q => (
            <div key={q.id} style={{ marginBottom: 20 }}>
              <label
                htmlFor={q.id}
                style={{ display: 'block', fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal, marginBottom: 6 }}
              >
                {q.question}
              </label>
              <FocusTextarea
                id={q.id}
                rows={3}
                value={answers[section.answersKey]?.[q.id] || ''}
                onChange={e => updateAnswer(section.answersKey, q.id, e.target.value)}
                placeholder="Type your answer..."
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ paddingTop: 16, borderTop: `1px solid ${c.stoneLight}` }}>
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', fontFamily: f.mono, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            backgroundColor: saving ? c.mist : c.charcoal, color: c.parchment,
            border: 'none', borderRadius: 4, padding: '16px 28px',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: '150ms ease',
          }}
        >
          {saving
            ? 'Saving & Computing Matches...'
            : isEditing
              ? 'Save Changes & Recompute Matches'
              : 'Complete Questionnaire'}
        </motion.button>
      </div>
    </form>
  )
}
