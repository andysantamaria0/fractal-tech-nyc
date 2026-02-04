interface Props {
  count: number
}

export default function WeeklyAppCounter({ count }: Props) {
  return (
    <div className="engineer-weekly-counter">
      <span className="engineer-weekly-count">{count}</span>
      <span className="engineer-weekly-label">
        {count === 1 ? 'application' : 'applications'} this week
      </span>
    </div>
  )
}
