import { SkeletonTable } from '@/components/Skeleton'

export default function AdHocMatchLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Ad-Hoc JD Match</h1>
        </div>
        <SkeletonTable rows={6} />
      </div>
    </div>
  )
}
