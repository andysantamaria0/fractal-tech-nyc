import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/posthog-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: matchId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { feedback, reason, category } = body

    if (!feedback || !['not_a_fit', 'applied'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Verify the match belongs to this engineer
    const { data: profile } = await serviceClient
      .from('engineers')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: match } = await serviceClient
      .from('engineer_job_matches')
      .select('id, engineer_id')
      .eq('id', matchId)
      .maybeSingle()

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Check ownership — if engineer_id doesn't match (possible after table
    // migration), fall back to email comparison and auto-heal the data.
    if (match.engineer_id !== profile.id) {
      const { data: matchEngineer } = await serviceClient
        .from('engineers')
        .select('email')
        .eq('id', match.engineer_id)
        .maybeSingle()

      if (!matchEngineer || matchEngineer.email !== profile.email) {
        console.error('[engineer/matches/feedback] Ownership mismatch:', {
          matchId, matchEngineerId: match.engineer_id, profileId: profile.id,
        })
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }

      // Auto-heal: fix the stale engineer_id
      await serviceClient
        .from('engineer_job_matches')
        .update({ engineer_id: profile.id })
        .eq('id', matchId)
      console.log(`[engineer/matches/feedback] Auto-healed engineer_id on match ${matchId}: ${match.engineer_id} → ${profile.id}`)
    }

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      feedback,
      feedback_at: now,
    }

    if (feedback === 'not_a_fit') {
      if (reason) updateData.feedback_reason = reason
      if (category) updateData.feedback_category = category
    }

    if (feedback === 'applied') {
      updateData.applied_at = now
      updateData.feedback_category = null
      updateData.feedback_reason = null
    }

    const { error: updateError } = await serviceClient
      .from('engineer_job_matches')
      .update(updateData)
      .eq('id', matchId)

    if (updateError) {
      console.error('[engineer/matches/feedback] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
    }

    // Auto-learn from feedback categories to update matching preferences
    if (feedback === 'not_a_fit' && category) {
      // Fetch the job to get location/company info
      const { data: matchData } = await serviceClient
        .from('engineer_job_matches')
        .select('scanned_job_id')
        .eq('id', matchId)
        .maybeSingle()

      let job: { location: string | null; company_name: string | null; company_domain: string | null } | null = null
      if (matchData?.scanned_job_id) {
        const { data } = await serviceClient
          .from('scanned_jobs')
          .select('location, company_name, company_domain')
          .eq('id', matchData.scanned_job_id)
          .maybeSingle()
        job = data
      }

      if (job) {
        // Fetch current preferences
        const { data: profilePrefs } = await serviceClient
          .from('engineers')
          .select('matching_preferences')
          .eq('id', profile.id)
          .maybeSingle()

        const raw = (profilePrefs?.matching_preferences || {}) as Record<string, unknown>
        const prefs = {
          excluded_locations: (raw.excluded_locations || []) as string[],
          excluded_companies: (raw.excluded_companies || []) as string[],
          excluded_company_domains: (raw.excluded_company_domains || []) as string[],
          excluded_keywords: (raw.excluded_keywords || []) as string[],
        }

        let prefsUpdated = false

        if (category === 'wrong_location' && job.location) {
          if (!prefs.excluded_locations.includes(job.location)) {
            prefs.excluded_locations.push(job.location)
            prefsUpdated = true
            console.log(`[feedback] Auto-excluded location: ${job.location}`)
          }
        }

        if (category === 'company_not_interesting' && job.company_domain) {
          if (!prefs.excluded_company_domains.includes(job.company_domain)) {
            prefs.excluded_company_domains.push(job.company_domain)
            prefsUpdated = true
            console.log(`[feedback] Auto-excluded company: ${job.company_domain}`)
          }
        }

        if (prefsUpdated) {
          await serviceClient
            .from('engineers')
            .update({ matching_preferences: prefs })
            .eq('id', profile.id)
        }
      }
    }

    trackServerEvent(user.id, feedback === 'applied' ? 'engineer_applied' : 'engineer_not_a_fit', {
      match_id: matchId,
      engineer_id: profile.id,
      ...(feedback === 'not_a_fit' && { category, reason: reason || undefined }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[engineer/matches/feedback] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
