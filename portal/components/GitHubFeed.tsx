'use client'

import { useEffect, useState } from 'react'
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

export default function GitHubFeed() {
  const [events, setEvents] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="window">
      <div className="window-title">GitHub Activity</div>
      <div className="window-content" style={{ padding: 0 }}>
        {loading && <div className="loading-text">Loading activity...</div>}
        {error && <div className="loading-text">{error}</div>}
        {!loading && !error && events.length === 0 && (
          <div className="loading-text">No recent activity</div>
        )}
        {events.length > 0 && (
          <ul className="feed-list">
            {events.map((event) => (
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
                    >
                      {event.description}
                    </a>
                  </div>
                  <div className="feed-time">{timeAgo(event.timestamp)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
