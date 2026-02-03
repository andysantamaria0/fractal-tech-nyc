import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyMatchMovedForward } from '@/lib/hiring-spa/notifications'
import { createServiceClient } from '@/lib/supabase/server'
import type { MatchDecision } from '@/lib/hiring-spa/types'

const VALID_DECISIONS: MatchDecision[] = ['moved_forward', 'passed']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { decision } = await request.json() as { decision: MatchDecision }

    if (!decision || !VALID_DECISIONS.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}` },
        { status: 400 },
      )
    }

    // RLS ensures company can only update their own matches
    const { data: match, error } = await supabase
      .from('hiring_spa_matches')
      .update({
        decision,
        decision_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found or update failed' }, { status: 404 })
    }

    // On moved_forward, fire notification (fire-and-forget)
    if (decision === 'moved_forward') {
      const serviceClient = await createServiceClient()
      notifyMatchMovedForward(id, serviceClient).catch((err) => {
        console.error('Failed to send move-forward notification:', err)
      })
    }

    return NextResponse.json({ match })
  } catch (error) {
    console.error('Match decision error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
