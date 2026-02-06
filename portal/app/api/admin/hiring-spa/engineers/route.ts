import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = serviceClient
      .from('engineers')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Fetch engineer profiles error:', error)
      return NextResponse.json({ error: 'Failed to fetch engineer profiles' }, { status: 500 })
    }

    return NextResponse.json({ profiles: profiles || [] })
  })
}

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { name, email, github_url, linkedin_url, portfolio_url, resume_url } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const { data: profile, error } = await serviceClient
      .from('engineers')
      .insert({
        name,
        email,
        github_url: github_url || null,
        linkedin_url: linkedin_url || null,
        portfolio_url: portfolio_url || null,
        resume_url: resume_url || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Create engineer profile error:', error)
      return NextResponse.json({ error: 'Failed to create engineer profile' }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 201 })
  })
}
