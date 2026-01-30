import { NextResponse } from 'next/server'
import { fetchOrgEvents } from '@/lib/github'

export async function GET() {
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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
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
