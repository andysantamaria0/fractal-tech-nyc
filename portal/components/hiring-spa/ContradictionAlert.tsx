'use client'

import type { Contradiction } from '@/lib/hiring-spa/types'

interface ContradictionAlertProps {
  contradiction: Contradiction
  onKeep: () => void
  onRevise: () => void
}

export default function ContradictionAlert({
  contradiction,
  onKeep,
  onRevise,
}: ContradictionAlertProps) {
  return (
    <div className={`spa-contradiction ${contradiction.resolved ? 'spa-contradiction-resolved' : ''}`}>
      <p className="spa-contradiction-signal">
        We found some public information that seems different — want to clarify?
      </p>
      <p className="spa-body-small" style={{ marginBottom: 12 }}>
        &ldquo;{contradiction.signal}&rdquo;
      </p>
      <p className="spa-body-small" style={{ fontStyle: 'italic', marginBottom: 8 }}>
        {contradiction.suggestion}
      </p>
      <p className="spa-contradiction-source">
        Source: {contradiction.source}
      </p>
      {!contradiction.resolved && (
        <div className="spa-contradiction-actions">
          <button className="spa-btn spa-btn-secondary" style={{ padding: '10px 20px', fontSize: 10 }} onClick={onKeep}>
            Keep my answer
          </button>
          <button className="spa-btn-text" onClick={onRevise}>
            Revise &rarr;
          </button>
        </div>
      )}
      {contradiction.resolved && (
        <p className="spa-label" style={{ marginTop: 8 }}>Resolved — kept original answer</p>
      )}
    </div>
  )
}
