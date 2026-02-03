import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { generateEngineerProfileSummary } from '@/lib/hiring-spa/engineer-summary'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    // Fetch the full engineer profile
    const { data: profile, error: fetchError } = await serviceClient
      .from('engineer_profiles_spa')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Engineer profile not found' }, { status: 404 })
    }

    // Generate summary
    const summary = await generateEngineerProfileSummary({
      engineerDna: profile.engineer_dna,
      workPreferences: profile.work_preferences,
      careerGrowth: profile.career_growth,
      strengths: profile.strengths,
      growthAreas: profile.growth_areas,
      dealBreakers: profile.deal_breakers,
    })

    // Save summary and update status
    const { data: updated, error: updateError } = await serviceClient
      .from('engineer_profiles_spa')
      .update({
        profile_summary: summary,
        status: 'complete',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Save engineer summary error:', updateError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({ profile: updated })
  })
}
