import type { ProfileSummary as ProfileSummaryType } from '@/lib/hiring-spa/types'

interface ProfileSummaryProps {
  summary: ProfileSummaryType
}

export default function ProfileSummary({ summary }: ProfileSummaryProps) {
  return (
    <div className="spa-summary-card">
      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 8 }}>Company Snapshot</p>
        <p className="spa-body">{summary.companySnapshot}</p>
      </div>

      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 12 }}>Culture Signature</p>
        <div className="spa-summary-traits">
          {summary.cultureSignature.map((trait, i) => (
            <span key={i} className="spa-summary-trait">{trait}</span>
          ))}
        </div>
      </div>

      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 8 }}>Working Environment</p>
        <p className="spa-body">{summary.workingEnvironment}</p>
      </div>

      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 8 }}>What Great Looks Like</p>
        <p className="spa-body">{summary.whatGreatLooksLike}</p>
      </div>

      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 8 }}>What Doesn&apos;t Work</p>
        <p className="spa-body">{summary.whatDoesntWork}</p>
      </div>

      <div className="spa-summary-section">
        <p className="spa-label" style={{ marginBottom: 8 }}>Technical Summary</p>
        <p className="spa-body">{summary.technicalSummary}</p>
      </div>
    </div>
  )
}
