import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa, EngineerJobMatchWithJob } from '@/lib/hiring-spa/types'
import JobMatchList from '@/components/engineer/JobMatchList'

export default async function EngineerMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('engineer_profiles_spa')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/engineer/onboard')

  if (profile.status !== 'complete') {
    redirect('/engineer/questionnaire')
  }

  const { data: matches } = await supabase
    .from('engineer_job_matches')
    .select('*, scanned_job:scanned_jobs(*)')
    .eq('engineer_profile_id', profile.id)
    .is('feedback', null)
    .order('display_rank', { ascending: true })
    .limit(10)

  return (
    <div className="engineer-matches-page">
      <div className="engineer-page-header">
        <h1>Your Job Matches</h1>
        <p className="engineer-page-desc">
          Top matches based on your profile and preferences. Scored across 5 dimensions.
        </p>
      </div>
      <JobMatchList matches={(matches || []) as EngineerJobMatchWithJob[]} />
    </div>
  )
}
