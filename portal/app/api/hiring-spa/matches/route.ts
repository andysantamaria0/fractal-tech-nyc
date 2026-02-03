import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MatchWithEngineer } from '@/lib/hiring-spa/types'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('role_id')

    if (!roleId) {
      return NextResponse.json({ error: 'role_id query parameter is required' }, { status: 400 })
    }

    // RLS ensures company can only read matches for their own roles
    const { data: matches, error } = await supabase
      .from('hiring_spa_matches')
      .select('*, engineer:engineer_profiles_spa(*), feedback:match_feedback(*)')
      .eq('role_id', roleId)
      .order('display_rank', { ascending: true })

    if (error) {
      console.error('Failed to fetch matches:', error)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    // Normalize feedback from join (array → single object or undefined)
    const normalized = (matches || []).map((m: Record<string, unknown>) => ({
      ...m,
      feedback: Array.isArray(m.feedback) ? m.feedback[0] || undefined : m.feedback || undefined,
    }))

    return NextResponse.json({ matches: normalized as MatchWithEngineer[] })
  } catch (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
