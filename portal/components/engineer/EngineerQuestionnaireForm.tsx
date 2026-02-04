'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EngineerProfileSpa, PriorityRatings } from '@/lib/hiring-spa/types'
import { ENGINEER_SECTIONS } from '@/lib/hiring-spa/engineer-priority-questions'
import PriorityRatingsForm from './PriorityRatingsForm'

interface Props {
  profile: EngineerProfileSpa
}

export default function EngineerQuestionnaireForm({ profile }: Props) {
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

  // Questionnaire answers state
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
    <form onSubmit={handleSubmit} className="engineer-questionnaire">
      {error && <div className="alert alert-error">{error}</div>}

      <PriorityRatingsForm ratings={priorities} onChange={setPriorities} />

      {ENGINEER_SECTIONS.map(section => (
        <div key={section.id} className="engineer-questionnaire-section">
          <h3>{section.title}</h3>
          <p className="engineer-section-desc">{section.description}</p>
          {section.questions.map(q => (
            <div key={q.id} className="form-group">
              <label htmlFor={q.id}>{q.question}</label>
              <textarea
                id={q.id}
                className="form-input"
                rows={3}
                value={answers[section.answersKey]?.[q.id] || ''}
                onChange={e => updateAnswer(section.answersKey, q.id, e.target.value)}
                placeholder="Type your answer..."
              />
            </div>
          ))}
        </div>
      ))}

      <div className="engineer-questionnaire-submit">
        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? 'Saving & Computing Matches...' : 'Complete Questionnaire'}
        </button>
      </div>
    </form>
  )
}
