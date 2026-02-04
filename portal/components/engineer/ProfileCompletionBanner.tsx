import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import Link from 'next/link'

interface Props {
  profile: EngineerProfileSpa
}

export default function ProfileCompletionBanner({ profile }: Props) {
  if (profile.status === 'complete') return null

  const missingFields: string[] = []
  if (!profile.linkedin_url) missingFields.push('LinkedIn')
  if (!profile.github_url) missingFields.push('GitHub')
  if (!profile.portfolio_url) missingFields.push('Portfolio')
  if (!profile.resume_url) missingFields.push('Resume')

  if (profile.status === 'draft' || profile.status === 'crawling') {
    return (
      <div className="engineer-banner engineer-banner-info">
        <div>
          <strong>Profile setup in progress</strong>
          <p>
            {profile.status === 'crawling'
              ? 'We\'re analyzing your online presence. This usually takes a minute.'
              : 'Add your GitHub or portfolio URL to get started.'}
          </p>
          {missingFields.length > 0 && (
            <p style={{ fontSize: 13, marginTop: 4 }}>
              Missing: {missingFields.join(', ')}
            </p>
          )}
        </div>
        <Link href="/engineer/profile" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Edit Profile
        </Link>
      </div>
    )
  }

  if (profile.status === 'questionnaire') {
    return (
      <div className="engineer-banner engineer-banner-action">
        <div>
          <strong>Complete your questionnaire</strong>
          <p>Answer a few questions so we can find your best job matches.</p>
        </div>
        <Link href="/engineer/questionnaire" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Start Questionnaire
        </Link>
      </div>
    )
  }

  return null
}
