import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerJobMatchWithJob } from '@/lib/hiring-spa/types'
import JobMatchList from '@/components/engineer/JobMatchList'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

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

  const [{ data: matches }, { count: totalMatchCount }] = await Promise.all([
    supabase
      .from('engineer_job_matches')
      .select('*, scanned_job:scanned_jobs(*)')
      .eq('engineer_profile_id', profile.id)
      .is('feedback', null)
      .order('display_rank', { ascending: true })
      .limit(10),
    supabase
      .from('engineer_job_matches')
      .select('*', { count: 'exact', head: true })
      .eq('engineer_profile_id', profile.id),
  ])

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 24, fontWeight: 400, color: c.charcoal, margin: '0 0 8px 0' }}>
          Your Job Matches
        </h1>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.graphite, margin: 0, lineHeight: 1.8 }}>
          Top matches based on your profile and preferences. Scored across 5 dimensions.
        </p>
      </div>
      <JobMatchList matches={(matches || []) as EngineerJobMatchWithJob[]} totalMatchCount={totalMatchCount ?? 0} />
    </div>
  )
}
