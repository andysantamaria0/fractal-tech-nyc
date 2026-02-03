'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/posthog'
import type { FeedItem } from '@/lib/github'

function getTypeIcon(type: FeedItem['type']): string {
  switch (type) {
    case 'push': return '>'
    case 'pr': return 'P'
    case 'review': return 'R'
    case 'comment': return 'C'
    default: return '*'
  }
}

function timeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const PAGE_SIZE = 10

const TYPE_FILTERS: { value: FeedItem['type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'push', label: 'Commits' },
  { value: 'pr', label: 'PRs' },
  { value: 'review', label: 'Reviews' },
  { value: 'comment', label: 'Comments' },
]

export default function GitHubFeed() {
  const [events, setEvents] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [typeFilter, setTypeFilter] = useState<FeedItem['type'] | 'all'>('all')

  useEffect(() => {
    async function fetchFeed() {
      try {
        const response = await fetch('/api/github/feed')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setEvents(data)
      } catch {
        setError('Could not load GitHub activity')
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [])

  const filteredEvents = typeFilter === 'all'
    ? events
    : events.filter((e) => e.type === typeFilter)
  const visibleEvents = filteredEvents.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEvents.length

  return (
    <div className="window">
      <div className="window-title">GitHub Activity</div>
      <div className="window-content" style={{ padding: 0 }}>
        {!loading && !error && events.length > 0 && (
          <div className="feed-filters">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`feed-filter-btn${typeFilter === f.value ? ' feed-filter-active' : ''}`}
                onClick={() => {
                  trackEvent('github_feed_filtered', { filter_type: f.value, previous_filter: typeFilter })
                  setTypeFilter(f.value)
                  setVisibleCount(PAGE_SIZE)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {loading && <div className="loading-text">Loading activity...</div>}
        {error && <div className="loading-text">{error}</div>}
        {!loading && !error && events.length === 0 && (
          <div className="loading-text">No recent activity</div>
        )}
        {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
          <div className="loading-text">No {typeFilter} activity</div>
        )}
        {visibleEvents.length > 0 && (
          <>
            <ul className="feed-list">
              {visibleEvents.map((event) => (
                <li key={event.id} className="feed-item">
                  <div className="feed-icon">{getTypeIcon(event.type)}</div>
                  <div className="feed-content">
                    <div className="feed-action">
                      <span className="feed-actor">{event.actor}</span>{' '}
                      {event.action}{' '}
                      <a
                        href={event.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feed-repo"
                      >
                        {event.repo}
                      </a>
                    </div>
                    <div className="feed-action">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feed-link"
                        onClick={() => trackEvent('github_activity_clicked', {
                          activity_type: event.type,
                        })}
                      >
                        {event.description}
                      </a>
                    </div>
                    <div className="feed-time">{timeAgo(event.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
