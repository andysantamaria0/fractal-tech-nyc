import { SkeletonTable } from '@/components/Skeleton'

export default function AdminContentLoading() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Admin</div>
          <h1 className="section-title">Content</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--color-border, #e2e2e2)', marginBottom: 'var(--space-5)' }}>
          <span
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              borderBottom: '2px solid var(--color-ink)',
              color: 'var(--color-ink)',
            }}
          >
            Highlights
          </span>
          <span
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              borderBottom: '2px solid transparent',
              color: 'var(--color-slate)',
            }}
          >
            Spotlight
          </span>
        </div>
        <SkeletonTable rows={5} />
      </div>
    </div>
  )
}
