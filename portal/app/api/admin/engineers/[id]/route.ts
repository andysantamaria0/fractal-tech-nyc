import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const serviceClient = await createServiceClient()

    const allowedFields = [
      'name', 'email', 'photo_url', 'github_url', 'github_username',
      'focus_areas', 'what_excites_you', 'availability_start',
      'availability_hours_per_week', 'availability_duration_weeks',
      'linkedin_url', 'portfolio_url', 'is_available_for_cycles',
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

    const { data: engineer, error: updateError } = await serviceClient
      .from('engineers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update engineer error:', updateError)
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'An engineer with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update engineer' }, { status: 500 })
    }

    if (!engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    return NextResponse.json({ engineer })
  } catch (error) {
    console.error('Admin engineers PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
