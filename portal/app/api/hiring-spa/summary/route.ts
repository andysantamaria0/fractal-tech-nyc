import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProfileSummary } from '@/lib/hiring-spa/summary'
import type {
  CompanyDNA,
  TechnicalEnvironment,
  CultureAnswers,
  MissionAnswers,
  TeamDynamicsAnswers,
  Contradiction,
} from '@/lib/hiring-spa/types'

export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch the full profile
    const { data: profile, error: fetchError } = await supabase
      .from('hiring_profiles')
      .select('company_dna, technical_environment, culture_answers, mission_answers, team_dynamics_answers, contradictions')
      .eq('company_id', user.id)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate that all sections have been filled
    if (!profile.culture_answers || !profile.mission_answers || !profile.team_dynamics_answers) {
      return NextResponse.json(
        { error: 'All questionnaire sections must be completed before generating a summary' },
        { status: 400 }
      )
    }

    // Generate the summary
    const summary = await generateProfileSummary({
      companyDna: profile.company_dna as CompanyDNA | null,
      technicalEnvironment: profile.technical_environment as TechnicalEnvironment | null,
      cultureAnswers: profile.culture_answers as CultureAnswers,
      missionAnswers: profile.mission_answers as MissionAnswers,
      teamDynamicsAnswers: profile.team_dynamics_answers as TeamDynamicsAnswers,
      contradictions: profile.contradictions as Contradiction[] | null,
    })

    // Save summary and update status to complete
    const { error: updateError } = await supabase
      .from('hiring_profiles')
      .update({
        profile_summary: summary,
        status: 'complete',
      })
      .eq('company_id', user.id)

    if (updateError) {
      console.error('Error saving summary:', updateError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Hiring spa summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
