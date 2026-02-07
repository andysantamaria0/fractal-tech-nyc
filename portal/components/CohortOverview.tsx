import React from 'react'

interface CohortOverviewProps {
  numEngineers: number
  currentWeek: number
  totalWeeks: number
  weekTitle?: string
  weekDescription?: string
}

/**
 * Parse simple HTML links (<a href="...">text</a>) into React elements.
 * All other HTML tags are stripped — only safe link content is rendered.
 */
function renderWithLinks(html: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const linkRegex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push(stripTags(html.slice(lastIndex, match.index)))
    }
    const href = match[1]
    const text = stripTags(match[2])
    if (href.startsWith('https://') || href.startsWith('http://')) {
      parts.push(<a key={match.index} href={href} target="_blank" rel="noopener noreferrer">{text}</a>)
    } else {
      parts.push(text)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < html.length) {
    parts.push(stripTags(html.slice(lastIndex)))
  }

  return parts
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

export default function CohortOverview({
  numEngineers,
  currentWeek,
  totalWeeks,
  weekTitle,
  weekDescription,
}: CohortOverviewProps) {
  return (
    <div className="window">
      <div className="window-title">Cohort Overview</div>
      <div className="window-content">
        <div className="cohort-stats">
          <div className="cohort-stat">
            {numEngineers} Engineers
          </div>
          <div className="cohort-stat">
            Week {currentWeek} of {totalWeeks}
          </div>
        </div>
        {(weekTitle || weekDescription) && (
          <div className="cohort-highlight">
            {weekTitle && <strong>This week: {weekTitle}</strong>}
            {weekDescription && <p>{renderWithLinks(weekDescription)}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
