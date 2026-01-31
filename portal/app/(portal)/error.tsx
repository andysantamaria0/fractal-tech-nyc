'use client'

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="dashboard">
      <div className="window" style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="window-title">Something Went Wrong</div>
        <div className="window-content" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            An error occurred
          </p>
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-6)' }}>
            {error.message || 'Please try again or contact support if the issue persists.'}
          </p>
          <button className="btn-primary" onClick={reset}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
