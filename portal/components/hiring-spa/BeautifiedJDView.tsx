import type { BeautifiedJD } from '@/lib/hiring-spa/types'

export default function BeautifiedJDView({ jd }: { jd: BeautifiedJD }) {
  const essential = jd.requirements.filter(r => r.category === 'essential')
  const niceToHave = jd.requirements.filter(r => r.category === 'nice_to_have')

  return (
    <div>
      {/* Requirements */}
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">What You Need</h3>
        {essential.length > 0 && (
          <>
            <span className="spa-jd-category-label">Essential</span>
            <ul className="spa-jd-requirements">
              {essential.map((req, i) => (
                <li key={i} className="spa-jd-requirement spa-jd-requirement-essential">
                  <p className="spa-jd-requirement-text">{req.text}</p>
                  {req.caveat && (
                    <p className="spa-jd-requirement-caveat">{req.caveat}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {niceToHave.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <span className="spa-jd-category-label">Nice to Have</span>
            <ul className="spa-jd-requirements">
              {niceToHave.map((req, i) => (
                <li key={i} className="spa-jd-requirement spa-jd-requirement-nice">
                  <p className="spa-jd-requirement-text">{req.text}</p>
                  {req.caveat && (
                    <p className="spa-jd-requirement-caveat">{req.caveat}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Team Context */}
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">The Team</h3>
        <p className="spa-jd-prose">{jd.team_context}</p>
      </div>

      {/* Working Vibe */}
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">Day to Day</h3>
        <p className="spa-jd-prose">{jd.working_vibe}</p>
      </div>

      {/* Culture Check */}
      <div className="spa-jd-section">
        <h3 className="spa-jd-section-title">Culture Check</h3>
        <p className="spa-jd-prose">{jd.culture_check}</p>
      </div>
    </div>
  )
}
