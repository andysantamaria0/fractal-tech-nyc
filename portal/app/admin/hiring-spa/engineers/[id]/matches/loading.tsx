import { SkeletonTable } from '@/components/Skeleton'

export default function AdminEngineerMatchesLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Engineer Matches</h1>
        </div>
        <SkeletonTable rows={8} />
      </div>
    </div>
  )
}
