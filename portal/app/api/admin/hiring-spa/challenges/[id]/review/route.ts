import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const body = await request.json()
    const { human_score, human_feedback, reviewer_name, reviewer_linkedin_url } = body as {
      human_score: number
      human_feedback: string
      reviewer_name: string
      reviewer_linkedin_url: string
    }

    // Validate
    if (human_score === undefined || human_score === null || human_score < 0 || human_score > 100) {
      return NextResponse.json({ error: 'human_score must be between 0 and 100' }, { status: 400 })
    }
    if (!human_feedback || !human_feedback.trim()) {
      return NextResponse.json({ error: 'human_feedback is required' }, { status: 400 })
    }
    if (!reviewer_name || !reviewer_name.trim()) {
      return NextResponse.json({ error: 'reviewer_name is required' }, { status: 400 })
    }

    // Fetch existing submission to get auto_score
    const { data: submission, error: fetchError } = await serviceClient
      .from('challenge_submissions')
      .select('id, auto_score')
      .eq('id', id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Compute final score
    let final_score: number
    if (submission.auto_score !== null) {
      final_score = Math.round((submission.auto_score + human_score) / 2)
    } else {
      final_score = human_score
    }

    const { error: updateError } = await serviceClient
      .from('challenge_submissions')
      .update({
        human_score,
        human_feedback: human_feedback.trim(),
        reviewer_name: reviewer_name.trim(),
        reviewer_linkedin_url: reviewer_linkedin_url?.trim() || null,
        reviewed_at: new Date().toISOString(),
        final_score,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating review:', updateError)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    return NextResponse.json({ success: true, final_score })
  })
}
