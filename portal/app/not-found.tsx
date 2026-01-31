import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-window">
        <div className="window">
          <div className="window-title">404 — Not Found</div>
          <div className="window-content" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Page not found
            </p>
            <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-6)' }}>
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
