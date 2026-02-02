import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const { data, error } = await serviceClient
      .from('engineer_interests')
      .select('engineer_id')

    if (error) {
      console.error('Fetch interest counts error:', error)
      return NextResponse.json({ error: 'Failed to fetch interest counts' }, { status: 500 })
    }

    // Aggregate counts per engineer
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.engineer_id] = (counts[row.engineer_id] || 0) + 1
    }

    return NextResponse.json({ counts })
  })
}
