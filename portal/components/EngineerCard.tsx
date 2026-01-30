import Link from 'next/link'

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
}

export default function EngineerCard({ engineer }: { engineer: Engineer }) {
  const initials = engineer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

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
        >
          Submit a Feature
        </Link>
      </div>
    </div>
  )
}
