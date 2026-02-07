import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectContradictions } from '@/lib/hiring-spa/contradictions'
import type { CrawlHighlight, Contradiction } from '@/lib/hiring-spa/types'
import type { SectionId } from '@/lib/hiring-spa/questions'

const SECTION_TO_COLUMN: Record<SectionId, string> = {
  culture: 'culture_answers',
  mission: 'mission_answers',
  team_dynamics: 'team_dynamics_answers',
  technical: 'technical_environment',
}

const SECTION_TO_TOPICS: Record<SectionId, CrawlHighlight['topic'][]> = {
  culture: ['culture', 'values', 'team', 'hiring'],
  mission: ['mission', 'values', 'product'],
  team_dynamics: ['team', 'culture'],
  technical: ['tech'],
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { section, answers } = body as { section: SectionId; answers: Record<string, string> }

    if (!section || !answers || !SECTION_TO_COLUMN[section]) {
      return NextResponse.json({ error: 'Invalid section or answers' }, { status: 400 })
    }

    const column = SECTION_TO_COLUMN[section]

    // Save answers to the appropriate column
    const { error: updateError } = await supabase
      .from('hiring_profiles')
      .update({ [column]: answers })
      .eq('company_id', user.id)

    if (updateError) {
      console.error('Error saving answers:', updateError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }

    // Fetch crawl data for contradiction detection
    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('crawl_data, contradictions')
      .eq('company_id', user.id)
      .maybeSingle()

    let newContradictions: Contradiction[] = []

    if (profile?.crawl_data && section !== 'technical') {
      // Extract crawl highlights from the crawl_data synthesis
      const crawlData = profile.crawl_data as { crawlHighlights?: CrawlHighlight[] }
      const allHighlights = crawlData.crawlHighlights || []
      const relevantTopics = SECTION_TO_TOPICS[section]
      const relevantHighlights = allHighlights.filter(h =>
        relevantTopics.includes(h.topic)
      )

      // Run contradiction detection
      newContradictions = await detectContradictions(section, answers, relevantHighlights)
    }

    // Merge contradictions: keep resolved ones from other sections, add new ones
    const existingContradictions = (profile?.contradictions || []) as Contradiction[]
    const otherSectionContradictions = existingContradictions.filter(c => {
      // Keep contradictions from other sections, and resolved ones from this section
      const questionIds = Object.keys(answers)
      return !questionIds.includes(c.question_id) || c.resolved
    })

    const mergedContradictions = [...otherSectionContradictions, ...newContradictions]

    // Save merged contradictions (always update, even when empty, to clear resolved ones)
    await supabase
      .from('hiring_profiles')
      .update({ contradictions: mergedContradictions })
      .eq('company_id', user.id)

    return NextResponse.json({
      success: true,
      contradictions: newContradictions.length > 0 ? newContradictions : null,
    })
  } catch (error) {
    console.error('Hiring spa answers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
