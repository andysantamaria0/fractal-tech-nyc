import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'

export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Fetch profile
    const { data: profile } = await serviceClient
      .from('engineers')
      .select('id, status')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.status !== 'complete') {
      return NextResponse.json({ error: 'Profile must be complete' }, { status: 400 })
    }

    const result = await computeMatchesForEngineer(profile.id, serviceClient)

    return NextResponse.json({ matches: result.matches })
  } catch (err) {
    console.error('[engineer/matches/compute] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
