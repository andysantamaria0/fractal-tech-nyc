import { SkeletonTable } from '@/components/Skeleton'

export default function AdminCyclesLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Cycles Dashboard</h1>
        </div>
        <div className="admin-tabs">
          {['All', 'Submitted', 'In Progress', 'Completed', 'Cancelled'].map((label) => (
            <div key={label} className="admin-tab">{label}</div>
          ))}
        </div>
        <SkeletonTable rows={6} />
      </div>
    </div>
  )
}
