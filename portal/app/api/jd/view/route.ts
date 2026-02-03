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
      .single()

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
    let matchData: {
      id: string
      overall_score: number
      dimension_scores: DimensionWeights
      highlight_quote: string | null
      challenge_response: string | null
      engineer_decision: 'interested' | 'not_interested' | null
      engineer_notified_at: string | null
      challenge_submission?: {
        id: string
        submitted_at: string
        auto_score: number | null
        auto_reasoning: string | null
        human_score: number | null
        human_feedback: string | null
        reviewer_name: string | null
        reviewer_linkedin_url: string | null
        final_score: number | null
      } | null
    } | null = null

    const { data: engineer } = await supabase
      .from('engineer_profiles_spa')
      .select('id')
      .eq('email', email)
      .single()

    if (engineer) {
      const { data: match } = await supabase
        .from('hiring_spa_matches')
        .select('id, overall_score, dimension_scores, highlight_quote, challenge_response, engineer_decision, engineer_notified_at')
        .eq('role_id', role.id)
        .eq('engineer_id', engineer.id)
        .single()

      if (match) {
        matchData = {
          id: match.id,
          overall_score: match.overall_score,
          dimension_scores: match.dimension_scores as DimensionWeights,
          highlight_quote: match.highlight_quote,
          challenge_response: match.challenge_response,
          engineer_decision: match.engineer_decision,
          engineer_notified_at: match.engineer_notified_at,
        }

        // Fetch challenge submission if exists
        const { data: submission } = await supabase
          .from('challenge_submissions')
          .select('id, submitted_at, auto_score, auto_reasoning, human_score, human_feedback, reviewer_name, reviewer_linkedin_url, final_score')
          .eq('match_id', match.id)
          .maybeSingle()

        matchData.challenge_submission = submission || null
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
