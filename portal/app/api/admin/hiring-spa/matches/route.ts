import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('role_id')

    if (!roleId) {
      return NextResponse.json({ error: 'role_id query parameter is required' }, { status: 400 })
    }

    const { data: matches, error } = await serviceClient
      .from('hiring_spa_matches')
      .select('*, engineer:engineer_profiles_spa(*)')
      .eq('role_id', roleId)
      .order('display_rank', { ascending: true })

    if (error) {
      console.error('Failed to fetch matches:', error)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    return NextResponse.json({ matches: matches || [] })
  })
}
