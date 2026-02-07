import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DiscoveredRole } from '@/lib/hiring-spa/types'

/**
 * POST: Import selected discovered roles as draft hiring_roles.
 * PATCH: Skip role selection and advance to questionnaire.
 */

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { selected_urls } = body as { selected_urls: string[] }

    if (!selected_urls || selected_urls.length === 0) {
      return NextResponse.json({ error: 'No roles selected' }, { status: 400 })
    }

    // 1. Get hiring profile with discovered roles
    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('id, discovered_roles, status')
      .eq('company_id', user.id)
      .maybeSingle()

    if (!profile || profile.status !== 'discovering_roles') {
      return NextResponse.json({ error: 'No discovered roles available' }, { status: 400 })
    }

    const discoveredRoles = (profile.discovered_roles as DiscoveredRole[]) || []

    // 2. Filter to selected roles
    const selectedRoles = discoveredRoles.filter(r => selected_urls.includes(r.url))

    // 3. Create hiring_roles for each selected role
    const createdRoles = []
    for (const role of selectedRoles) {
      const { data, error } = await supabase
        .from('hiring_roles')
        .insert({
          hiring_profile_id: profile.id,
          source_url: role.url,
          source_content: role.raw_text,
          title: role.title,
          status: 'draft',
        })
        .select('*')
        .single()

      if (!error && data) {
        createdRoles.push(data)
      }
    }

    // 4. Move to questionnaire status
    await supabase
      .from('hiring_profiles')
      .update({ status: 'questionnaire' })
      .eq('id', profile.id)

    return NextResponse.json({
      roles: createdRoles,
      status: 'questionnaire',
    })
  } catch (error) {
    console.error('Role selection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('id, status')
      .eq('company_id', user.id)
      .maybeSingle()

    if (!profile || profile.status !== 'discovering_roles') {
      return NextResponse.json({ error: 'Not in discovering_roles state' }, { status: 400 })
    }

    await supabase
      .from('hiring_profiles')
      .update({ status: 'questionnaire' })
      .eq('id', profile.id)

    return NextResponse.json({ status: 'questionnaire' })
  } catch (error) {
    console.error('Role selection skip error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
