import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import EngineerProfileView from '@/components/engineer/EngineerProfileView'
import Link from 'next/link'

export default async function EngineerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineer_profiles_spa')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')

  const typedProfile = profile as EngineerProfileSpa

  return (
    <div className="engineer-profile-page">
      <div className="engineer-page-header">
        <h1>Your Profile</h1>
      </div>
      <EngineerProfileView profile={typedProfile} />

      {typedProfile.status === 'complete' && (
        <div className="engineer-profile-questionnaire-link">
          <h3>Questionnaire Answers</h3>
          <p>Your preferences and priorities are used to score job matches. Updating them will trigger a fresh round of matching.</p>
          <Link href="/engineer/questionnaire" className="btn-secondary">
            Edit Questionnaire
          </Link>
        </div>
      )}

      {!typedProfile.resume_url && typedProfile.status !== 'draft' && (
        <div className="engineer-resume-prompt">
          <strong>Resume not found</strong>
          <p>We couldn&apos;t find a resume on your portfolio or GitHub. Add a direct link to help companies evaluate your background.</p>
          <Link href="/engineer/profile" className="btn-secondary">
            Add Resume URL
          </Link>
        </div>
      )}
    </div>
  )
}
