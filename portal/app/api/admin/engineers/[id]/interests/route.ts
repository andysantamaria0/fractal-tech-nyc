import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id: engineerId } = await params

    const { data, error } = await serviceClient
      .from('engineer_interests')
      .select('user_id, created_at')
      .eq('engineer_id', engineerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch engineer interests error:', error)
      return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 })
    }

    // Look up profile info for each user
    const userIds = (data || []).map((d: { user_id: string }) => d.user_id)
    let profiles: Record<string, { name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profileData } = await serviceClient
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)

      for (const p of profileData || []) {
        profiles[p.id] = { name: p.name, email: p.email }
      }
    }

    const interests = (data || []).map((d: { user_id: string; created_at: string }) => ({
      id: d.user_id,
      name: profiles[d.user_id]?.name || 'Unknown',
      email: profiles[d.user_id]?.email || '',
      created_at: d.created_at,
    }))

    return NextResponse.json({ interests })
  })
}
