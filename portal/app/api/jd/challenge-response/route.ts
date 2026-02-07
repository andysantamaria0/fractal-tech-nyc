import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, email, response } = body as {
      slug: string
      email: string
      response: 'accepted' | 'declined'
    }

    if (!slug || !email || !response) {
      return NextResponse.json({ error: 'slug, email, and response are required' }, { status: 400 })
    }

    if (response !== 'accepted' && response !== 'declined') {
      return NextResponse.json({ error: 'response must be accepted or declined' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Look up role by slug
    const { data: role, error: roleError } = await supabase
      .from('hiring_roles')
      .select('id')
      .eq('public_slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Look up engineer by email
    const { data: engineer, error: engineerError } = await supabase
      .from('engineers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (engineerError || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Update match record
    const { error: updateError } = await supabase
      .from('hiring_spa_matches')
      .update({
        challenge_response: response,
        challenge_response_at: new Date().toISOString(),
      })
      .eq('role_id', role.id)
      .eq('engineer_id', engineer.id)

    if (updateError) {
      console.error('Error updating challenge response:', updateError)
      return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Challenge response error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
