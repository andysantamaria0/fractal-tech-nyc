'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EngineerProfileSpa, PriorityRatings } from '@/lib/hiring-spa/types'
import { ENGINEER_SECTIONS } from '@/lib/hiring-spa/engineer-priority-questions'
import PriorityRatingsForm from './PriorityRatingsForm'

const c = {
  charcoal: '#2C2C2C', graphite: '#5C5C5C', mist: '#9C9C9C', honey: '#C9A86C',
  parchment: '#FAF8F5', fog: '#F7F5F2',
  stoneLight: 'rgba(166, 155, 141, 0.12)',
}
const f = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", Monaco, Inconsolata, "Fira Code", monospace',
}

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

interface Props {
  profile: EngineerProfileSpa
  isEditing?: boolean
}

export default function EngineerQuestionnaireForm({ profile, isEditing }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [priorities, setPriorities] = useState<PriorityRatings>(
    profile.priority_ratings || {
      work_life_balance: 3,
      culture: 3,
      mission_driven: 3,
      technical_challenges: 3,
    }
  )

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/engineer/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority_ratings: priorities,
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
      router.refresh()
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

      {ENGINEER_SECTIONS.map(section => (
        <div key={section.id} style={{ marginBottom: 40 }}>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
            {section.title}
          </h3>
          <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 20px 0', lineHeight: 1.6 }}>
            {section.description}
          </p>
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
        <button
          type="submit"
          disabled={saving}
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
        </button>
      </div>
    </form>
  )
}
