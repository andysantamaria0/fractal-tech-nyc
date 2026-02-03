'use client'

import { useRef } from 'react'
import type { QuestionDefinition } from '@/lib/hiring-spa/questions'
import type { Contradiction } from '@/lib/hiring-spa/types'
import ContradictionAlert from './ContradictionAlert'

interface AdaptiveQuestionProps {
  question: QuestionDefinition
  value: string
  isDraft: boolean
  contradictions: Contradiction[]
  onChange: (value: string) => void
  onResolveContradiction: (questionId: string) => void
}

export default function AdaptiveQuestion({
  question,
  value,
  isDraft,
  contradictions,
  onChange,
  onResolveContradiction,
}: AdaptiveQuestionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Show short question if draft value exists
  const displayQuestion = isDraft
    ? question.shortQuestion
    : question.question

  const questionContradictions = contradictions.filter(
    c => c.question_id === question.id
  )

  const scrollToTextarea = () => {
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="spa-question">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <p className="spa-question-text">{displayQuestion}</p>
      </div>

      <textarea
        ref={textareaRef}
        className="spa-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts..."
        rows={4}
      />

      {isDraft && (
        <p className="spa-body-small" style={{ color: '#888', marginTop: 4 }}>
          Pre-filled from your website — edit to make it yours
        </p>
      )}

      {questionContradictions.map((c, i) => (
        <ContradictionAlert
          key={`${c.question_id}-${i}`}
          contradiction={c}
          onKeep={() => onResolveContradiction(c.question_id)}
          onRevise={scrollToTextarea}
        />
      ))}
    </div>
  )
}
