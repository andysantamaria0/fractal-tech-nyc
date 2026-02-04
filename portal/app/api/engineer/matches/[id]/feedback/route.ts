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
      .from('engineer_profiles_spa')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: match } = await serviceClient
      .from('engineer_job_matches')
      .select('id, engineer_profile_id')
      .eq('id', matchId)
      .single()

    if (!match || match.engineer_profile_id !== profile.id) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
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
    }

    const { error: updateError } = await serviceClient
      .from('engineer_job_matches')
      .update(updateData)
      .eq('id', matchId)

    if (updateError) {
      console.error('[engineer/matches/feedback] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
    }

    trackServerEvent(user.id, feedback === 'applied' ? 'engineer_applied' : 'engineer_not_a_fit', {
      match_id: matchId,
      engineer_profile_id: profile.id,
      ...(feedback === 'not_a_fit' && { category, reason: reason || undefined }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[engineer/matches/feedback] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
