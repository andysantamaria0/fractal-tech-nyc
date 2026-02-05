'use client'

import type { PriorityRatings } from '@/lib/hiring-spa/types'
import { PRIORITY_QUESTIONS } from '@/lib/hiring-spa/engineer-priority-questions'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

const RATING_LABELS = ['', 'Low', 'Moderate', 'Important', 'Very Important', 'Critical']

interface Props {
  ratings: PriorityRatings
  onChange: (ratings: PriorityRatings) => void
}

export default function PriorityRatingsForm({ ratings, onChange }: Props) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ fontFamily: f.serif, fontSize: 18, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
        What matters most to you?
      </h3>
      <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: '0 0 24px 0' }}>
        Rate how important each factor is in your next role (1-5).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {PRIORITY_QUESTIONS.map(q => {
          const value = ratings[q.key]
          return (
            <div key={q.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontFamily: f.mono, fontSize: 11, letterSpacing: '0.05em', color: c.charcoal }}>
                  {q.label}
                </span>
                <span style={{ fontFamily: f.mono, fontSize: 10, color: c.honey }}>
                  {RATING_LABELS[value]}
                </span>
              </div>
              <p style={{ fontFamily: f.serif, fontSize: 13, color: c.mist, margin: '0 0 8px 0' }}>
                {q.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: f.mono, fontSize: 9, color: c.mist }}>1</span>
                <input
                  type="range" min={1} max={5} step={1} value={value}
                  onChange={e => onChange({ ...ratings, [q.key]: parseInt(e.target.value) })}
                  style={{
                    flex: 1, WebkitAppearance: 'none', appearance: 'none' as React.CSSProperties['appearance'],
                    height: 4, background: c.stoneLight, borderRadius: 2, outline: 'none',
                  }}
                />
                <span style={{ fontFamily: f.mono, fontSize: 9, color: c.mist }}>5</span>
                <span style={{ fontFamily: f.mono, fontSize: 12, color: c.graphite, width: 20, textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
