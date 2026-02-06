import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json({ error: 'roleId query parameter is required' }, { status: 400 })
    }

    const { data: matches, error } = await serviceClient
      .from('hiring_spa_matches')
      .select('id, overall_score, challenge_response, challenge_response_at, engineer:engineers(id, name, email), challenge_submission:challenge_submissions(*)')
      .eq('role_id', roleId)
      .not('challenge_response', 'is', null)
      .order('challenge_response_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch challenge submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
    }

    // Normalize challenge_submission from array to single object
    const normalized = (matches || []).map((m: Record<string, unknown>) => ({
      ...m,
      challenge_submission: Array.isArray(m.challenge_submission)
        ? m.challenge_submission[0] || null
        : m.challenge_submission || null,
    }))

    return NextResponse.json({ matches: normalized })
  })
}
