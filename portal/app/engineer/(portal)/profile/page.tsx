import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EngineerProfileSpa } from '@/lib/hiring-spa/types'
import EngineerProfileView from '@/components/engineer/EngineerProfileView'

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

  return (
    <div className="engineer-profile-page">
      <div className="engineer-page-header">
        <h1>Your Profile</h1>
      </div>
      <EngineerProfileView profile={profile as EngineerProfileSpa} />
    </div>
  )
}
