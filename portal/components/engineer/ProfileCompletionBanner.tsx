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
      <div className="engineer-completion-banner">
        <div>
          <h3>
            {profile.status === 'crawling'
              ? 'Analyzing your profile...'
              : 'Step 1: Add your links'}
          </h3>
          <p>
            {profile.status === 'crawling'
              ? 'We\'re scanning your GitHub and portfolio to build your technical DNA. This usually takes about a minute — refresh to check.'
              : 'Add your GitHub or portfolio URL so we can analyze your technical strengths.'}
          </p>
          {missingFields.length > 0 && (
            <div className="engineer-missing-fields">
              Missing: {missingFields.join(', ')}
            </div>
          )}
        </div>
        <Link href={profile.status === 'draft' ? '/engineer/onboard' : '/engineer/profile'} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          {profile.status === 'draft' ? 'Complete Profile' : 'Edit Profile'}
        </Link>
      </div>
    )
  }

  if (profile.status === 'questionnaire') {
    return (
      <div className="engineer-completion-banner">
        <div>
          <h3>Step 2: Complete your questionnaire</h3>
          <p>Answer a few questions about what you&apos;re looking for so we can match you to the right jobs. Takes about 5 minutes.</p>
        </div>
        <Link href="/engineer/questionnaire" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Start Questionnaire
        </Link>
      </div>
    )
  }

  return null
}
