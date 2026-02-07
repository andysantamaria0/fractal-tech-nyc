import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // RLS ensures company can only read their own profile
    const { data: profile, error } = await supabase
      .from('hiring_profiles')
      .select('id, company_id, status, crawl_completed_at, company_dna, technical_environment, contradictions, culture_answers, mission_answers, team_dynamics_answers, profile_summary, created_at, updated_at')
      .eq('company_id', user.id)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ profile: null })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Hiring spa profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
