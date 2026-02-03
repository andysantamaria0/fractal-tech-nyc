'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  HiringProfile,
  Contradiction,
  TechnicalEnvironment,
  CultureAnswers,
  MissionAnswers,
  TeamDynamicsAnswers,
} from '@/lib/hiring-spa/types'
import { SECTIONS, ALL_QUESTIONS } from '@/lib/hiring-spa/questions'
import type { SectionId } from '@/lib/hiring-spa/questions'
import { trackEvent } from '@/lib/posthog'
import QuestionSection from './QuestionSection'
import AdaptiveQuestion from './AdaptiveQuestion'
import TechEditor from './TechEditor'

interface QuestionnaireFormProps {
  profile: HiringProfile
}

type AllAnswers = {
  culture: Record<string, string>
  mission: Record<string, string>
  team_dynamics: Record<string, string>
}

function getInitialAnswers(profile: HiringProfile): AllAnswers {
  const culture = profile.culture_answers as CultureAnswers | null
  const mission = profile.mission_answers as MissionAnswers | null
  const teamDynamics = profile.team_dynamics_answers as TeamDynamicsAnswers | null
  const drafts = profile.questionnaire_drafts

  return {
    culture: {
      successful_employees: culture?.successful_employees || drafts?.successful_employees || '',
      why_employees_stay: culture?.why_employees_stay || drafts?.why_employees_stay || '',
      best_people_attributes: culture?.best_people_attributes || drafts?.best_people_attributes || '',
      honest_working_style: culture?.honest_working_style || drafts?.honest_working_style || '',
      what_doesnt_work: culture?.what_doesnt_work || drafts?.what_doesnt_work || '',
    },
    mission: {
      actual_mission: mission?.actual_mission || drafts?.actual_mission || '',
      revealing_tradeoffs: mission?.revealing_tradeoffs || drafts?.revealing_tradeoffs || '',
    },
    team_dynamics: {
      daily_communication: teamDynamics?.daily_communication || drafts?.daily_communication || '',
      decision_making_style: teamDynamics?.decision_making_style || drafts?.decision_making_style || '',
      conflict_handling: teamDynamics?.conflict_handling || drafts?.conflict_handling || '',
    },
  }
}

function getInitialTech(profile: HiringProfile): TechnicalEnvironment {
  const te = profile.technical_environment
  return {
    primaryLanguages: te?.primaryLanguages ?? [],
    frameworks: te?.frameworks ?? [],
    infrastructure: te?.infrastructure ?? [],
    devPractices: te?.devPractices ?? [],
    openSourceInvolvement: te?.openSourceInvolvement ?? '',
  }
}

/**
 * Compute which question IDs are showing draft values (no saved answer but draft exists).
 */
function getInitialDraftQuestions(profile: HiringProfile): Set<string> {
  const draftIds = new Set<string>()
  const drafts = profile.questionnaire_drafts
  if (!drafts) return draftIds

  // Check if a section has been saved (i.e. user already confirmed answers)
  const sectionSaved: Record<string, boolean> = {
    culture: !!profile.culture_answers,
    mission: !!profile.mission_answers,
    team_dynamics: !!profile.team_dynamics_answers,
  }

  for (const q of ALL_QUESTIONS) {
    if (!sectionSaved[q.section] && drafts[q.id]) {
      draftIds.add(q.id)
    }
  }
  return draftIds
}

export default function QuestionnaireForm({ profile }: QuestionnaireFormProps) {
  const [answers, setAnswers] = useState<AllAnswers>(() => getInitialAnswers(profile))
  const [techEnv, setTechEnv] = useState<TechnicalEnvironment>(() => getInitialTech(profile))
  const [contradictions, setContradictions] = useState<Contradiction[]>(
    () => (profile.contradictions || [])
  )
  const [savedSections, setSavedSections] = useState<Set<SectionId>>(() => {
    const saved = new Set<SectionId>()
    if (profile.culture_answers) saved.add('culture')
    if (profile.mission_answers) saved.add('mission')
    if (profile.team_dynamics_answers) saved.add('team_dynamics')
    if (profile.technical_environment) saved.add('technical')
    return saved
  })
  const [draftQuestions, setDraftQuestions] = useState<Set<string>>(() => getInitialDraftQuestions(profile))
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const hasTrackedStart = useRef(false)

  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackEvent('questionnaire_started', { sections_already_saved: savedSections.size })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasDrafts = draftQuestions.size > 0

  const updateAnswer = useCallback((section: 'culture' | 'mission' | 'team_dynamics', questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [questionId]: value,
      },
    }))
  }, [])

  const resolveContradiction = useCallback((questionId: string) => {
    setContradictions(prev =>
      prev.map(c =>
        c.question_id === questionId ? { ...c, resolved: true } : c
      )
    )
  }, [])

  const saveSection = useCallback(async (sectionId: SectionId) => {
    const sectionAnswers = sectionId === 'technical'
      ? techEnv
      : answers[sectionId]

    const res = await fetch('/api/hiring-spa/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: sectionId, answers: sectionAnswers }),
    })

    if (!res.ok) {
      throw new Error('Failed to save')
    }

    const data = await res.json()

    if (data.contradictions) {
      setContradictions(prev => {
        // Merge: remove old unresolved for this section's questions, add new
        const questionIds = Object.keys(sectionId === 'technical' ? {} : answers[sectionId])
        const kept = prev.filter(c => !questionIds.includes(c.question_id) || c.resolved)
        return [...kept, ...data.contradictions]
      })
    }

    // Clear draft indicators for questions in this section
    const sectionDef = SECTIONS.find(s => s.id === sectionId)
    if (sectionDef && sectionDef.questions.length > 0) {
      setDraftQuestions(prev => {
        const next = new Set(prev)
        for (const q of sectionDef.questions) {
          next.delete(q.id)
        }
        return next
      })
    }

    const newSaved = new Set([...savedSections, sectionId])
    setSavedSections(newSaved)

    trackEvent('questionnaire_section_saved', {
      section_id: sectionId,
      sections_completed: newSaved.size,
      had_contradictions: (data.contradictions?.length ?? 0) > 0,
    })
  }, [answers, techEnv, savedSections])

  const allSectionsSaved = SECTIONS.every(s => savedSections.has(s.id))

  const generateSummary = async () => {
    setGeneratingSummary(true)
    setSummaryError('')
    try {
      const res = await fetch('/api/hiring-spa/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate summary')
      }

      trackEvent('questionnaire_completed')
      // Reload to show the summary page
      window.location.href = '/hiring-spa'
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setGeneratingSummary(false)
    }
  }

  return (
    <div>
      {hasDrafts && !allSectionsSaved && (
        <div className="spa-banner" style={{
          background: '#f0f4ff',
          border: '1px solid #d0d9f0',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 32,
        }}>
          <p className="spa-body" style={{ margin: 0 }}>
            We&apos;ve prepared some answers based on what we learned about your company.
            Review each section, make any edits, and save to confirm.
          </p>
        </div>
      )}

      {SECTIONS.map((section) => {
        if (section.id === 'technical') {
          return (
            <QuestionSection
              key={section.id}
              title={section.title}
              description={section.description}
              sectionId={section.id}
              isSaved={savedSections.has(section.id)}
              onSave={() => saveSection(section.id)}
            >
              <TechEditor value={techEnv} onChange={setTechEnv} />
            </QuestionSection>
          )
        }

        const sectionId = section.id as 'culture' | 'mission' | 'team_dynamics'

        return (
          <QuestionSection
            key={section.id}
            title={section.title}
            description={section.description}
            sectionId={section.id}
            isSaved={savedSections.has(section.id)}
            onSave={() => saveSection(section.id)}
          >
            {section.questions.map((q) => (
              <AdaptiveQuestion
                key={q.id}
                question={q}
                value={answers[sectionId][q.id] || ''}
                isDraft={draftQuestions.has(q.id)}
                contradictions={contradictions}
                onChange={(val) => updateAnswer(sectionId, q.id, val)}
                onResolveContradiction={resolveContradiction}
              />
            ))}
          </QuestionSection>
        )
      })}

      <hr className="spa-divider" style={{ margin: '48px 0' }} />

      <div style={{ textAlign: 'center', paddingBottom: 48 }}>
        <p className="spa-heading-2" style={{ marginBottom: 8 }}>
          Ready to generate your profile?
        </p>
        <p className="spa-body-muted" style={{ marginBottom: 24 }}>
          {allSectionsSaved
            ? 'All sections saved. Generate your profile summary for engineers to see.'
            : 'Save all four sections to enable profile generation.'}
        </p>
        <button
          className="spa-btn spa-btn-primary"
          style={{ padding: '14px 32px' }}
          disabled={!allSectionsSaved || generatingSummary}
          onClick={generateSummary}
        >
          {generatingSummary ? 'Generating...' : 'Generate Profile Summary'}
        </button>
        {summaryError && (
          <p className="spa-body-small" style={{ color: '#c44', marginTop: 12 }}>{summaryError}</p>
        )}
      </div>
    </div>
  )
}
