import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const { data, error } = await serviceClient
      .from('adhoc_matches')
      .select('*, engineer:engineers(id, name, email)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch adhoc match history error:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({ matches: data || [] })
  })
}
