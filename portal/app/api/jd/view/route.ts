import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { BeautifiedJD, DimensionWeights } from '@/lib/hiring-spa/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, email } = body as { slug: string; email: string }

    if (!slug || !email) {
      return NextResponse.json({ error: 'slug and email are required' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Fetch the active role by slug, including challenge fields
    const { data: role, error } = await supabase
      .from('hiring_roles')
      .select('id, title, beautified_jd, status, challenge_enabled, challenge_prompt')
      .eq('public_slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (!role.beautified_jd) {
      return NextResponse.json({ error: 'Job description not yet available' }, { status: 404 })
    }

    // Record the page view
    await supabase
      .from('jd_page_views')
      .insert({
        role_id: role.id,
        viewer_email: email,
      })

    // Look up engineer profile by email
    // Look up match state (without exposing scores to unauthenticated endpoint)
    let matchData: {
      has_match: boolean
      challenge_response: string | null
      engineer_decision: 'interested' | 'not_interested' | null
      challenge_submitted: boolean
    } | null = null

    const { data: engineer } = await supabase
      .from('engineers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (engineer) {
      const { data: match } = await supabase
        .from('hiring_spa_matches')
        .select('id, challenge_response, engineer_decision')
        .eq('role_id', role.id)
        .eq('engineer_id', engineer.id)
        .maybeSingle()

      if (match) {
        // Check if challenge submission exists
        const { data: submission } = await supabase
          .from('challenge_submissions')
          .select('id')
          .eq('match_id', match.id)
          .maybeSingle()

        matchData = {
          has_match: true,
          challenge_response: match.challenge_response,
          engineer_decision: match.engineer_decision,
          challenge_submitted: !!submission,
        }
      }
    }

    return NextResponse.json({
      title: role.title,
      beautified_jd: role.beautified_jd as BeautifiedJD,
      match: matchData,
      challenge: role.challenge_enabled ? {
        enabled: true,
        prompt: role.challenge_prompt,
      } : null,
    })
  } catch (error) {
    console.error('Public JD view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
