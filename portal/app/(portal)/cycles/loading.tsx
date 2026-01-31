import { SkeletonCard } from '@/components/Skeleton'

export default function CyclesLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Cycles</div>
          <h1 className="section-title">Available Engineers</h1>
          <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 'var(--space-7)' }} />
        </div>
        <div className="engineers-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
