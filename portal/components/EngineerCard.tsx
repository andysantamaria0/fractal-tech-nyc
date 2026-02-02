'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/posthog'
import type { Engineer } from '@/lib/types'

interface EngineerCardProps {
  engineer: Engineer
  interested?: boolean
}

export default function EngineerCard({ engineer, interested: initialInterested = false }: EngineerCardProps) {
  const [interested, setInterested] = useState(initialInterested)
  const [toggling, setToggling] = useState(false)

  const firstName = (engineer.name || '?').split(' ')[0]
  const initials = (engineer.name || '?')
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase() || '?'

  async function handleToggleInterest() {
    setToggling(true)
    try {
      const res = await fetch(`/api/engineers/${engineer.id}/interest`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setInterested(data.interested)
        trackEvent('engineer_interest_toggled', {
          engineer_id: engineer.id,
          engineer_name: engineer.name,
          interested: data.interested,
        })
      }
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="engineer-card">
      <div className="engineer-card-body">
        {/* Left: photo + name */}
        <div className="engineer-card-left">
          <div className="engineer-photo">
            {engineer.photo_url ? (
              <img src={engineer.photo_url} alt={firstName} />
            ) : (
              initials
            )}
          </div>
          <div className="engineer-name">{firstName}</div>
          {engineer.cohort && (
            <span className="engineer-tag" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              {engineer.cohort}
            </span>
          )}
        </div>

        {/* Center: tags + links */}
        <div className="engineer-card-center">
          {engineer.focus_areas && engineer.focus_areas.length > 0 && (
            <div className="engineer-focus">
              {engineer.focus_areas.map((area) => (
                <span key={area} className="engineer-tag">
                  {area}
                </span>
              ))}
            </div>
          )}

          {(engineer.availability_hours_per_week || engineer.availability_duration_weeks) && (
            <div className="engineer-availability">
              {engineer.availability_hours_per_week && (
                <span className="engineer-tag">
                  {engineer.availability_hours_per_week}h/week
                </span>
              )}
              {engineer.availability_duration_weeks && (
                <span className="engineer-tag">
                  {engineer.availability_duration_weeks} weeks
                </span>
              )}
            </div>
          )}

          <div className="engineer-links">
            {engineer.github_url && (
              <a
                href={engineer.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="engineer-link"
              >
                GitHub
              </a>
            )}
            {engineer.portfolio_url && (
              <a
                href={engineer.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="engineer-link"
              >
                Portfolio
              </a>
            )}
          </div>
        </div>

        {/* Right: action button */}
        <div className="engineer-card-right">
          <button
            className={interested ? 'btn-secondary btn-full' : 'btn-primary btn-full'}
            style={{ fontSize: 'var(--text-sm)' }}
            onClick={handleToggleInterest}
            disabled={toggling}
          >
            {toggling ? '...' : interested ? 'Interest Submitted' : 'Express Interest!'}
          </button>
        </div>
      </div>
    </div>
  )
}
