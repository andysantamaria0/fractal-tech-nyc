'use client'

import type { PriorityRatings } from '@/lib/hiring-spa/types'
import { PRIORITY_QUESTIONS } from '@/lib/hiring-spa/engineer-priority-questions'

interface Props {
  ratings: PriorityRatings
  onChange: (ratings: PriorityRatings) => void
}

const RATING_LABELS = ['', 'Low', 'Moderate', 'Important', 'Very Important', 'Critical']

export default function PriorityRatingsForm({ ratings, onChange }: Props) {
  return (
    <div className="engineer-priority-ratings">
      <h3>What matters most to you?</h3>
      <p className="engineer-section-desc">
        Rate how important each factor is in your next role (1-5).
      </p>
      {PRIORITY_QUESTIONS.map(q => {
        const value = ratings[q.key]
        return (
          <div key={q.id} className="engineer-priority-item">
            <div className="engineer-priority-header">
              <label className="engineer-priority-label">{q.label}</label>
              <span className="engineer-priority-value-label">{RATING_LABELS[value]}</span>
            </div>
            <p className="engineer-priority-desc">{q.description}</p>
            <div className="engineer-rating-slider">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={e => onChange({ ...ratings, [q.key]: parseInt(e.target.value) })}
                className="engineer-slider"
              />
              <div className="engineer-slider-labels">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={n === value ? 'active' : ''}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
