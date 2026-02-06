import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('engineers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch top 10 matches with job details
    const { data: matches, error } = await supabase
      .from('engineer_job_matches')
      .select('*, scanned_job:scanned_jobs(*)')
      .eq('engineer_id', profile.id)
      .is('feedback', null)
      .order('display_rank', { ascending: true })
      .limit(10)

    if (error) {
      console.error('[engineer/matches] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    return NextResponse.json({ matches: matches || [] })
  } catch (err) {
    console.error('[engineer/matches] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
