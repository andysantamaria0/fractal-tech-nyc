import { NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyDiscordMatchesComputed } from '@/lib/discord'
import { generateEngineerProfileSummary } from '@/lib/hiring-spa/engineer-summary'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'
import { notifyEngineerMatchesReady } from '@/lib/hiring-spa/notifications'
import { trackServerEvent } from '@/lib/posthog-server'

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
      preferred_locations,
      work_preferences,
      career_growth,
      strengths,
      growth_areas,
      deal_breakers,
    } = body

    if (!priority_ratings) {
      return NextResponse.json({ error: 'Priority ratings are required' }, { status: 400 })
    }

    // Validate each section has at least 1 non-empty answer
    const sectionEntries = [
      { key: 'work_preferences', label: 'Work Preferences', data: work_preferences },
      { key: 'career_growth', label: 'Career Growth', data: career_growth },
      { key: 'strengths', label: 'Strengths', data: strengths },
      { key: 'growth_areas', label: 'Growth Areas', data: growth_areas },
      { key: 'deal_breakers', label: 'Deal Breakers', data: deal_breakers },
    ]

    const missingSections = sectionEntries
      .filter(({ data }) => {
        if (!data || typeof data !== 'object') return true
        return !Object.values(data).some(v => typeof v === 'string' && (v as string).trim().length > 0)
      })
      .map(({ label }) => label)

    if (missingSections.length > 0) {
      return NextResponse.json({
        error: `Please answer at least one question in each section. Missing: ${missingSections.join(', ')}`,
        missing_sections: missingSections,
      }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Fetch profile
    const { data: profile } = await serviceClient
      .from('engineers')
      .select('id, name, status, engineer_dna')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isCrawling = profile.status === 'crawling'

    // Save answers — update status only if crawl is already done
    const updatePayload: Record<string, unknown> = {
      priority_ratings,
      preferred_locations: preferred_locations || null,
      work_preferences: work_preferences || null,
      career_growth: career_growth || null,
      strengths: strengths || null,
      growth_areas: growth_areas || null,
      deal_breakers: deal_breakers || null,
    }

    // If crawl is actively running, keep the current status so the crawl
    // pipeline knows to advance to 'complete' when it finishes.
    // Mark questionnaire_completed_at so the crawl pipeline can detect it.
    // Note: 'draft' means no crawl was ever triggered, so we can proceed.
    if (isCrawling) {
      updatePayload.questionnaire_completed_at = new Date().toISOString()
      console.log('[engineer/questionnaire] Crawl still running — saving answers, deferring matches')
    }

    const { error: updateError } = await serviceClient
      .from('engineers')
      .update(updatePayload)
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer/questionnaire] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }

    // If crawl is still running, return early — the crawl pipeline will
    // handle summary generation and match computation when it finishes
    if (isCrawling) {
      return NextResponse.json({ success: true, pending_crawl: true })
    }

    // Mark as complete immediately so the UI can proceed
    await serviceClient
      .from('engineers')
      .update({ status: 'complete', questionnaire_completed_at: new Date().toISOString() })
      .eq('id', profile.id)

    const isEditing = profile.status === 'complete'

    trackServerEvent(user.id, 'engineer_questionnaire_submitted', {
      engineer_id: profile.id,
      is_editing: isEditing,
      crawl_pending: isCrawling,
    })

    // If editing existing profile, delete old matches to force re-scoring
    if (isEditing) {
      console.log('[engineer/questionnaire] Profile edit detected — clearing old matches for re-scoring')
      await serviceClient
        .from('engineer_job_matches')
        .delete()
        .eq('engineer_id', profile.id)
        .is('feedback', null) // keep matches with feedback for learning
    }

    // Run summary generation + match computation in the background
    after(async () => {
      try {
        const { data: fullProfile } = await serviceClient
          .from('engineers')
          .select('*')
          .eq('id', profile.id)
          .maybeSingle()

        if (fullProfile) {
          try {
            const summary = await generateEngineerProfileSummary({
              engineerDna: fullProfile.engineer_dna,
              workPreferences: fullProfile.work_preferences,
              careerGrowth: fullProfile.career_growth,
              strengths: fullProfile.strengths,
              growthAreas: fullProfile.growth_areas,
              dealBreakers: fullProfile.deal_breakers,
            })
            await serviceClient
              .from('engineers')
              .update({ profile_summary: summary })
              .eq('id', profile.id)
          } catch (summaryErr) {
            console.error('[engineer/questionnaire] Summary generation failed:', summaryErr)
          }
        }

        const result = await computeMatchesForEngineer(profile.id, serviceClient)
        if (result.matches.length > 0) {
          notifyDiscordMatchesComputed({
            engineerName: profile.name || 'Unknown',
            matchCount: result.matches.length,
          }).catch(err => console.error('[engineer/questionnaire] Discord notify error:', err))
          await notifyEngineerMatchesReady(profile.id, result.matches.length, serviceClient)
        }
      } catch (err) {
        console.error('[engineer/questionnaire] Background processing error:', err)
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[engineer/questionnaire] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
