import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const serviceClient = await createServiceClient()
    const { data: engineers, error: fetchError } = await serviceClient
      .from('engineers')
      .select('*')
      .order('name')

    if (fetchError) {
      console.error('Fetch engineers error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch engineers' }, { status: 500 })
    }

    return NextResponse.json({ engineers: engineers || [] })
  } catch (error) {
    console.error('Admin engineers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const body = await request.json()

    const allowedFields = [
      'name', 'email', 'photo_url', 'github_url', 'github_username',
      'focus_areas', 'what_excites_you', 'availability_start',
      'availability_hours_per_week', 'availability_duration_weeks',
      'linkedin_url', 'portfolio_url', 'is_available_for_cycles',
    ]

    const insert: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        insert[field] = body[field]
      }
    }

    if (!insert.name || !insert.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data: engineer, error: insertError } = await serviceClient
      .from('engineers')
      .insert(insert)
      .select()
      .single()

    if (insertError) {
      console.error('Insert engineer error:', insertError)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An engineer with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed to create engineer: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ engineer }, { status: 201 })
  } catch (error) {
    console.error('Admin engineers POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Internal server error: ${msg}` }, { status: 500 })
  }
}
