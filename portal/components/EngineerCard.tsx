'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

interface Engineer {
  id: string
  name: string
  photo_url?: string
  github_url: string
  github_username?: string
  focus_areas: string[]
  what_excites_you?: string
  linkedin_url?: string
  portfolio_url?: string
  availability_start?: string
  availability_hours_per_week?: number
  availability_duration_weeks?: number
}

export default function EngineerCard({ engineer }: { engineer: Engineer }) {
  const initials = (engineer.name || '?')
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="engineer-card">
      <div className="engineer-card-title">{engineer.name}</div>
      <div className="engineer-card-body">
        <div className="engineer-photo">
          {engineer.photo_url ? (
            <img src={engineer.photo_url} alt={engineer.name} />
          ) : (
            initials
          )}
        </div>

        <div className="engineer-name">{engineer.name}</div>

        {engineer.focus_areas.length > 0 && (
          <div className="engineer-focus">
            {engineer.focus_areas.map((area) => (
              <span key={area} className="engineer-tag">
                {area}
              </span>
            ))}
          </div>
        )}

        {engineer.what_excites_you && (
          <p className="engineer-bio">{engineer.what_excites_you}</p>
        )}

        {(engineer.availability_start || engineer.availability_hours_per_week) && (
          <div className="engineer-availability">
            {engineer.availability_start && (
              <span className="engineer-tag">
                Starts {new Date(engineer.availability_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
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
          <a
            href={engineer.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="engineer-link"
          >
            GitHub
          </a>
          {engineer.linkedin_url && (
            <a
              href={engineer.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="engineer-link"
            >
              LinkedIn
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

        <Link
          href={`/cycles/submit?engineer=${engineer.id}`}
          className="btn-secondary btn-full"
          style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)' }}
          onClick={() => trackEvent('engineer_profile_viewed', {
            engineer_id: engineer.id,
            engineer_name: engineer.name,
          })}
        >
          Submit a Feature
        </Link>
      </div>
    </div>
  )
}
