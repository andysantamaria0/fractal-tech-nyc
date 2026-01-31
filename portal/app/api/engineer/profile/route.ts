import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      photo_url,
      github_url,
      focus_areas,
      what_excites_you,
      availability_start,
      availability_hours_per_week,
      availability_duration_weeks,
      linkedin_url,
      portfolio_url,
    } = body

    if (!name || !github_url) {
      return NextResponse.json(
        { error: 'Name and GitHub URL are required' },
        { status: 400 }
      )
    }

    // Input length validation
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 })
    }
    if (what_excites_you && what_excites_you.length > 1000) {
      return NextResponse.json({ error: 'What excites you must be 1000 characters or less' }, { status: 400 })
    }

    // URL format validation
    const urlFields = { github_url, linkedin_url, portfolio_url, photo_url }
    for (const [field, value] of Object.entries(urlFields)) {
      if (value) {
        try {
          const parsed = new URL(value)
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return NextResponse.json({ error: `${field} must use http or https` }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: `${field} is not a valid URL` }, { status: 400 })
        }
      }
    }

    const serviceClient = await createServiceClient()

    // Check if profile already exists
    const { data: existing } = await serviceClient
      .from('engineers')
      .select('id')
      .eq('email', user.email!)
      .single()

    const engineerData = {
      name,
      email: user.email!,
      photo_url,
      github_url,
      github_username: github_url.replace('https://github.com/', '').replace(/\/$/, '') || null,
      focus_areas: focus_areas || [],
      what_excites_you,
      availability_start,
      availability_hours_per_week,
      availability_duration_weeks,
      linkedin_url,
      portfolio_url,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // Update
      const { data: updated, error: updateError } = await serviceClient
        .from('engineers')
        .update(engineerData)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Engineer update error:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      return NextResponse.json({ engineer: updated })
    } else {
      // Insert
      const { data: created, error: insertError } = await serviceClient
        .from('engineers')
        .insert({
          ...engineerData,
          is_available_for_cycles: false,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Engineer insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return NextResponse.json({ engineer: created }, { status: 201 })
    }
  } catch (error) {
    console.error('Engineer profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
