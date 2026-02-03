import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MatchFeedback } from '@/lib/hiring-spa/types'

export async function GET(
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

    // RLS ensures company can only read their own match feedback
    const { data: feedback } = await supabase
      .from('match_feedback')
      .select('*')
      .eq('match_id', id)
      .single()

    return NextResponse.json({ feedback: (feedback as MatchFeedback) || null })
  } catch (error) {
    console.error('Match feedback fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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

    const body = await request.json()
    const { hired, rating, worked_well, didnt_work, would_use_again } = body as {
      hired: boolean
      rating?: number
      worked_well?: string
      didnt_work?: string
      would_use_again?: boolean
    }

    if (typeof hired !== 'boolean') {
      return NextResponse.json({ error: 'hired is required' }, { status: 400 })
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    // Upsert feedback (unique on match_id)
    const { data: feedback, error } = await supabase
      .from('match_feedback')
      .upsert(
        {
          match_id: id,
          hired,
          rating: rating ?? null,
          worked_well: worked_well ?? null,
          didnt_work: didnt_work ?? null,
          would_use_again: would_use_again ?? null,
        },
        { onConflict: 'match_id' }
      )
      .select('*')
      .single()

    if (error) {
      console.error('Match feedback upsert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: feedback as MatchFeedback })
  } catch (error) {
    console.error('Match feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
