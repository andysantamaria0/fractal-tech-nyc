import { NextResponse } from 'next/server'
import { fetchOrgEvents } from '@/lib/github'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Require authentication — portal data is not public
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const org = process.env.GITHUB_ORG
  const token = process.env.GITHUB_TOKEN

  if (!org || !token) {
    return NextResponse.json(
      { error: 'GitHub configuration missing' },
      { status: 500 }
    )
  }

  try {
    const events = await fetchOrgEvents(org, token)
    return NextResponse.json(events, {
      headers: {
        'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('GitHub feed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub activity' },
      { status: 500 }
    )
  }
}
