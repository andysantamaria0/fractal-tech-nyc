'use client'

import { trackEvent } from '@/lib/posthog'

interface SpotlightItem {
  id: string
  title: string
  content_type: 'video' | 'text' | 'image' | 'embed'
  content_url?: string
  content_body?: string
}

export default function SpotlightSection({
  items,
}: {
  items: SpotlightItem[]
}) {
  if (items.length === 0) return null

  function handleVideoPlay(item: SpotlightItem) {
    trackEvent('spotlight_video_played', {
      content_id: item.id,
      content_title: item.title,
    })
  }

  return (
    <div className="window">
      <div className="window-title">Spotlight</div>
      <div className="window-content" style={{ padding: 0 }}>
        {items.map((item) => (
          <div key={item.id} className="spotlight-content">
            {item.content_type === 'video' && item.content_url && (
              <>
                <div
                  className="spotlight-video-wrapper"
                  onClick={() => handleVideoPlay(item)}
                >
                  <iframe
                    className="spotlight-video"
                    src={item.content_url}
                    title={item.title}
                    allowFullScreen
                    frameBorder="0"
                  />
                </div>
                <p style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>
                  {item.title}
                </p>
              </>
            )}
            {item.content_type === 'text' && (
              <>
                <p style={{ fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                  {item.title}
                </p>
                <p className="spotlight-text">{item.content_body}</p>
              </>
            )}
            {item.content_type === 'image' && item.content_url && (
              <>
                <img
                  src={item.content_url}
                  alt={item.title}
                  style={{
                    width: '100%',
                    border: '2px solid var(--color-charcoal)',
                  }}
                />
                <p style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>
                  {item.title}
                </p>
              </>
            )}
            {item.content_type === 'embed' && item.content_url && (
              <>
                <div className="spotlight-video-wrapper">
                  <iframe
                    className="spotlight-video"
                    src={item.content_url}
                    title={item.title}
                    allowFullScreen
                    frameBorder="0"
                  />
                </div>
                <p style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>
                  {item.title}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
