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
      .select('id, name, status, engineer_dna')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const crawlDone = profile.status !== 'crawling' && profile.status !== 'draft'

    // Save answers — update status only if crawl is already done
    const updatePayload: Record<string, unknown> = {
      priority_ratings,
      work_preferences: work_preferences || null,
      career_growth: career_growth || null,
      strengths: strengths || null,
      growth_areas: growth_areas || null,
      deal_breakers: deal_breakers || null,
    }

    // If crawl is still running, keep the current status so the crawl
    // pipeline knows to advance to 'complete' when it finishes.
    // Mark questionnaire_completed_at so the crawl pipeline can detect it.
    if (!crawlDone) {
      updatePayload.questionnaire_completed_at = new Date().toISOString()
      console.log('[engineer/questionnaire] Crawl still running — saving answers, deferring matches')
    }

    const { error: updateError } = await serviceClient
      .from('engineer_profiles_spa')
      .update(updatePayload)
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer/questionnaire] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }

    // If crawl is still running, return early — the crawl pipeline will
    // handle summary generation and match computation when it finishes
    if (!crawlDone) {
      return NextResponse.json({ success: true, pending_crawl: true })
    }

    // Mark as complete immediately so the UI can proceed
    await serviceClient
      .from('engineer_profiles_spa')
      .update({ status: 'complete' })
      .eq('id', profile.id)

    trackServerEvent(user.id, 'engineer_questionnaire_submitted', {
      engineer_profile_id: profile.id,
      is_editing: profile.status === 'complete',
      crawl_pending: !crawlDone,
    })

    // Run summary generation + match computation in the background
    after(async () => {
      try {
        const { data: fullProfile } = await serviceClient
          .from('engineer_profiles_spa')
          .select('*')
          .eq('id', profile.id)
          .single()

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
              .from('engineer_profiles_spa')
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
