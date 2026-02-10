import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateEngineerProfileSummary } from '@/lib/hiring-spa/engineer-summary'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, work_preferences, career_growth, strengths, growth_areas, deal_breakers } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Look up profile by email
    const { data: profile, error: lookupError } = await serviceClient
      .from('engineers')
      .select('id, status, engineer_dna')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (lookupError) {
      console.error('[engineer-apply-answers] Lookup error:', lookupError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.status !== 'questionnaire') {
      return NextResponse.json(
        { error: `Profile status is '${profile.status}', expected 'questionnaire'` },
        { status: 400 },
      )
    }

    // Save questionnaire answers
    const { error: updateError } = await serviceClient
      .from('engineers')
      .update({
        work_preferences: work_preferences || null,
        career_growth: career_growth || null,
        strengths: strengths || null,
        growth_areas: growth_areas || null,
        deal_breakers: deal_breakers || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer-apply-answers] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }

    // Generate profile summary (synchronous — engineer waits)
    const profileSummary = await generateEngineerProfileSummary({
      engineerDna: profile.engineer_dna,
      workPreferences: work_preferences || null,
      careerGrowth: career_growth || null,
      strengths: strengths || null,
      growthAreas: growth_areas || null,
      dealBreakers: deal_breakers || null,
    })

    // Update status to complete + save summary
    const { data: updatedProfile, error: finalError } = await serviceClient
      .from('engineers')
      .update({
        profile_summary: profileSummary,
        status: 'complete',
        questionnaire_completed_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('id, status, profile_summary')
      .maybeSingle()

    if (finalError || !updatedProfile) {
      console.error('[engineer-apply-answers] Final update error:', finalError)
      return NextResponse.json({ error: 'Failed to finalize profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: updatedProfile })
  } catch (err) {
    console.error('[engineer-apply-answers] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
