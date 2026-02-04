import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateEngineerProfileSummary } from '@/lib/hiring-spa/engineer-summary'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      priority_ratings,
      work_preferences,
      career_growth,
      strengths,
      growth_areas,
      deal_breakers,
    } = body

    if (!priority_ratings) {
      return NextResponse.json({ error: 'Priority ratings are required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Fetch profile
    const { data: profile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Save answers
    const { error: updateError } = await serviceClient
      .from('engineer_profiles_spa')
      .update({
        priority_ratings,
        work_preferences: work_preferences || null,
        career_growth: career_growth || null,
        strengths: strengths || null,
        growth_areas: growth_areas || null,
        deal_breakers: deal_breakers || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer/questionnaire] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }

    // Generate profile summary
    try {
      const { data: fullProfile } = await serviceClient
        .from('engineer_profiles_spa')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (fullProfile) {
        const summary = await generateEngineerProfileSummary({
          engineerDna: fullProfile.engineer_dna,
          workPreferences: fullProfile.work_preferences,
          careerGrowth: fullProfile.career_growth,
          strengths: fullProfile.strengths,
          growthAreas: fullProfile.growth_areas,
          dealBreakers: fullProfile.deal_breakers,
        })
        await serviceClient
          .from('engineer_profiles_spa')
          .update({
            profile_summary: summary,
            status: 'complete',
          })
          .eq('id', profile.id)
      }
    } catch (summaryErr) {
      console.error('[engineer/questionnaire] Summary generation failed:', summaryErr)
      // Still mark as complete even if summary fails
      await serviceClient
        .from('engineer_profiles_spa')
        .update({ status: 'complete' })
        .eq('id', profile.id)
    }

    // Auto-trigger match computation (fire and forget)
    computeMatchesForEngineer(profile.id, serviceClient).catch(
      err => console.error('[engineer/questionnaire] Match computation error:', err),
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[engineer/questionnaire] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
