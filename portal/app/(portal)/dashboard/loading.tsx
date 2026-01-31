import { SkeletonText, SkeletonCard } from '@/components/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="window">
          <div className="window-title">
            <div className="skeleton skeleton-text" style={{ width: 160 }} />
          </div>
          <div className="window-content">
            <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <div className="skeleton skeleton-block" style={{ width: 120, height: 36 }} />
              <div className="skeleton skeleton-block" style={{ width: 120, height: 36 }} />
              <div className="skeleton skeleton-block" style={{ width: 120, height: 36 }} />
            </div>
            <SkeletonText lines={2} width="70%" />
          </div>
        </div>

        <div className="window">
          <div className="window-title">
            <div className="skeleton skeleton-text" style={{ width: 140 }} />
          </div>
          <div className="window-content">
            <SkeletonText lines={5} width="80%" />
          </div>
        </div>

        <div className="engineers-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
