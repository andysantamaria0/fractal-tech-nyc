import { NextResponse, after } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'
import { notifyEngineerMatchesReady } from '@/lib/hiring-spa/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    const { data: engineer, error } = await serviceClient
      .from('engineers')
      .select('id, name, status, questionnaire_completed_at, priority_ratings')
      .eq('id', id)
      .single()

    if (error || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    if (engineer.status !== 'complete') {
      return NextResponse.json(
        { error: `Engineer status is '${engineer.status}', must be 'complete'` },
        { status: 400 },
      )
    }

    if (!engineer.priority_ratings) {
      return NextResponse.json(
        { error: 'Engineer has not completed the questionnaire — no preference data to match against' },
        { status: 400 },
      )
    }

    // Backfill questionnaire_completed_at if missing (bug fix for older records)
    if (!engineer.questionnaire_completed_at) {
      await serviceClient
        .from('engineers')
        .update({ questionnaire_completed_at: new Date().toISOString() })
        .eq('id', id)
    }

    // Run match computation in the background to avoid Vercel timeout
    after(async () => {
      try {
        const result = await computeMatchesForEngineer(id, serviceClient)
        if (result.matches.length > 0) {
          await notifyEngineerMatchesReady(id, result.matches.length, serviceClient)
        }
        console.log(`[admin/matches] Computed ${result.matches.length} matches for ${engineer.name}`)
      } catch (err) {
        console.error(`[admin/matches] Failed to compute matches for ${engineer.name}:`, err)
      }
    })

    return NextResponse.json({
      engineer: engineer.name,
      status: 'computing',
      message: 'Match computation started. Results will appear shortly.',
    })
  })
}
