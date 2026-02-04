import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import Link from 'next/link'

const c = {
  parchment: '#FAF8F5', charcoal: '#2C2C2C', graphite: '#5C5C5C', mist: '#9C9C9C',
  honeyBorder: 'rgba(201, 168, 108, 0.30)',
}
const f = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", Monaco, Inconsolata, "Fira Code", monospace',
}

export default function ProfileCompletionBanner({ profile }: { profile: EngineerProfileSpa }) {
  if (profile.status === 'complete') return null

  const missingFields: string[] = []
  if (!profile.linkedin_url) missingFields.push('LinkedIn')
  if (!profile.github_url) missingFields.push('GitHub')
  if (!profile.portfolio_url) missingFields.push('Portfolio')
  if (!profile.resume_url) missingFields.push('Resume')

  let title = ''
  let desc = ''
  let href = ''
  let btnLabel = ''

  if (profile.status === 'crawling') {
    title = 'Analyzing your profile...'
    desc = "We're scanning your GitHub and portfolio to build your technical DNA. This usually takes about a minute — refresh to check."
    href = '/engineer/profile'
    btnLabel = 'Edit Profile'
  } else if (profile.status === 'draft') {
    title = 'Step 1: Add your links'
    desc = 'Add your GitHub or portfolio URL so we can analyze your technical strengths.'
    href = '/engineer/onboard'
    btnLabel = 'Complete Profile'
  } else if (profile.status === 'questionnaire') {
    title = 'Step 2: Complete your questionnaire'
    desc = "Answer a few questions about what you're looking for so we can match you to the right jobs. Takes about 5 minutes."
    href = '/engineer/questionnaire'
    btnLabel = 'Start Questionnaire'
  } else {
    return null
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      backgroundColor: c.parchment, border: `1px solid ${c.honeyBorder}`,
      borderRadius: 8, padding: '20px 24px', marginBottom: 32,
    }}>
      <div>
        <h3 style={{ fontFamily: f.serif, fontSize: 16, fontWeight: 400, color: c.charcoal, margin: '0 0 4px 0' }}>
          {title}
        </h3>
        <p style={{ fontFamily: f.serif, fontSize: 14, color: c.graphite, margin: 0, lineHeight: 1.6 }}>
          {desc}
        </p>
        {missingFields.length > 0 && (
          <p style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em', color: c.mist, marginTop: 8 }}>
            Missing: {missingFields.join(', ')}
          </p>
        )}
      </div>
      <Link href={href} style={{
        fontFamily: f.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
        backgroundColor: c.charcoal, color: c.parchment, textDecoration: 'none',
        borderRadius: 4, padding: '14px 24px', whiteSpace: 'nowrap', transition: '150ms ease',
      }}>
        {btnLabel}
      </Link>
    </div>
  )
}
