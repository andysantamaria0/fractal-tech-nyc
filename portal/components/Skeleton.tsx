export function SkeletonText({ width = '100%', lines = 1 }: { width?: string; lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? width : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="window">
      <div className="window-title">
        <div className="skeleton skeleton-text" style={{ width: 120 }} />
      </div>
      <div className="window-content">
        <div className="skeleton skeleton-block" style={{ width: 64, height: 64, marginBottom: 'var(--space-4)' }} />
        <SkeletonText lines={3} width="60%" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="window">
      <div className="window-title">
        <div className="skeleton skeleton-text" style={{ width: 160 }} />
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <div className="skeleton skeleton-text" style={{ width: '20%' }} />
            <div className="skeleton skeleton-text" style={{ width: '30%' }} />
            <div className="skeleton skeleton-text" style={{ width: '15%' }} />
            <div className="skeleton skeleton-text" style={{ width: '15%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
