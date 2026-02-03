import Link from 'next/link'
import RoleSubmissionForm from '@/components/hiring-spa/RoleSubmissionForm'

export default function NewRolePage() {
  return (
    <div className="spa-page">
      <div style={{ marginBottom: 32 }}>
        <Link href="/hiring-spa/roles" className="spa-btn-text" style={{ textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>
          &larr; Back to Roles
        </Link>
        <h1 className="spa-heading-1" style={{ marginBottom: 4 }}>Add a Role</h1>
        <p className="spa-body-muted">
          Paste a job posting URL or type the description. We&apos;ll extract the content and beautify it.
        </p>
      </div>

      <RoleSubmissionForm />
    </div>
  )
}
