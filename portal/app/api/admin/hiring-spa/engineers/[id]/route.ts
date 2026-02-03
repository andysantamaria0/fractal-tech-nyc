import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    const { data: profile, error } = await serviceClient
      .from('engineer_profiles_spa')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Engineer profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const body = await request.json()

    // Allowed fields for update
    const allowedFields = [
      'name', 'email', 'github_url', 'linkedin_url', 'portfolio_url', 'resume_url',
      'engineer_id', 'work_preferences', 'career_growth', 'strengths',
      'growth_areas', 'deal_breakers', 'status',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: profile, error } = await serviceClient
      .from('engineer_profiles_spa')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update engineer profile error:', error)
      return NextResponse.json({ error: 'Failed to update engineer profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  })
}
