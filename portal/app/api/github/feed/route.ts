import { NextResponse } from 'next/server'
import { fetchOrgEvents, fetchUserEvents, mergeAndDedup } from '@/lib/github'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  // Require authentication — portal data is not public
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'GitHub configuration missing' },
      { status: 500 }
    )
  }

  try {
    // Get sp2026 engineer GitHub usernames
    const serviceClient = await createServiceClient()
    const { data: engineers } = await serviceClient
      .from('engineers')
      .select('github_username')
      .eq('cohort', 'sp2026')
      .not('github_username', 'is', null)

    const allowedUsernames = new Set(
      (engineers || []).map((e) => e.github_username!.toLowerCase())
    )

    const feeds = []

    // Fetch org events if configured
    const org = process.env.GITHUB_ORG
    if (org) {
      feeds.push(fetchOrgEvents(org, token))
    }

    // Fetch individual engineer events
    for (const username of allowedUsernames) {
      feeds.push(fetchUserEvents(username, token, 15))
    }

    const results = await Promise.all(feeds)
    const events = mergeAndDedup(results, 30)
      .filter((item) => allowedUsernames.has(item.actor.toLowerCase()))

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
