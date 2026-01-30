interface CohortOverviewProps {
  numEngineers: number
  currentWeek: number
  totalWeeks: number
  weekTitle?: string
  weekDescription?: string
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
            {weekDescription && <p>{weekDescription}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
