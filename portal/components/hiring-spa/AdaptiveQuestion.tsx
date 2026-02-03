'use client'

import { useRef } from 'react'
import type { QuestionDefinition } from '@/lib/hiring-spa/questions'
import type { Contradiction } from '@/lib/hiring-spa/types'
import ContradictionAlert from './ContradictionAlert'

interface AdaptiveQuestionProps {
  question: QuestionDefinition
  value: string
  prefillValue: string
  confidence: number
  contradictions: Contradiction[]
  onChange: (value: string) => void
  onResolveContradiction: (questionId: string) => void
}

export default function AdaptiveQuestion({
  question,
  value,
  prefillValue,
  confidence,
  contradictions,
  onChange,
  onResolveContradiction,
}: AdaptiveQuestionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isHighConfidence = confidence >= 0.7
  const isMediumConfidence = confidence >= 0.4

  // Show short question if high confidence and pre-fill exists
  const displayQuestion = isHighConfidence && prefillValue
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
        {isHighConfidence && prefillValue && (
          <span className="spa-badge spa-badge-confidence">Based on your website</span>
        )}
      </div>

      {isMediumConfidence && !isHighConfidence && prefillValue && (
        <div className="spa-question-hint">
          {prefillValue}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="spa-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isHighConfidence && prefillValue
            ? 'Edit or confirm the pre-filled answer above'
            : 'Share your thoughts...'
        }
        rows={4}
      />

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
