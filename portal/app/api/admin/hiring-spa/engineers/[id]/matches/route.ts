import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'
import { notifyEngineerMatchesReady } from '@/lib/hiring-spa/notifications'

export const maxDuration = 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    const { data: engineer, error: engErr } = await serviceClient
      .from('engineers')
      .select('id, name, email')
      .eq('id', id)
      .single()

    if (engErr || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    const { data: matches, error: matchErr } = await serviceClient
      .from('engineer_job_matches')
      .select('id, engineer_id, scanned_job_id, overall_score, dimension_scores, display_rank, feedback, feedback_category, feedback_at, applied_at, created_at, scanned_job:scanned_jobs(company_name, job_title, job_url, location)')
      .eq('engineer_id', id)
      .order('display_rank', { ascending: true, nullsFirst: false })
      .order('overall_score', { ascending: false })

    if (matchErr) {
      console.error('Failed to fetch matches:', matchErr)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    return NextResponse.json({
      engineer: { id: engineer.id, name: engineer.name, email: engineer.email },
      matches: (matches || []).map((m) => {
        const job = Array.isArray(m.scanned_job) ? m.scanned_job[0] : m.scanned_job
        return {
          id: m.id,
          displayRank: m.display_rank,
          overallScore: m.overall_score,
          dimensionScores: m.dimension_scores,
          feedback: m.feedback,
          feedbackCategory: m.feedback_category,
          feedbackAt: m.feedback_at,
          appliedAt: m.applied_at,
          createdAt: m.created_at,
          jobTitle: job?.job_title || 'Unknown',
          companyName: job?.company_name || 'Unknown',
          jobUrl: job?.job_url || null,
          location: job?.location || null,
        }
      }),
    })
  })
}

// Prevent concurrent match computations for the same engineer
const computingSet = new Set<string>()

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    if (computingSet.has(id)) {
      return NextResponse.json(
        { error: 'Match computation already in progress for this engineer' },
        { status: 409 },
      )
    }

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

    computingSet.add(id)
    try {
      const result = await computeMatchesForEngineer(id, serviceClient)
      if (result.matches.length > 0) {
        await notifyEngineerMatchesReady(id, result.matches.length, serviceClient)
      }
      console.log(`[admin/matches] Computed ${result.matches.length} matches for ${engineer.name}`)
      return NextResponse.json({
        engineer: engineer.name,
        status: 'done',
        matchCount: result.matches.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[admin/matches] Failed to compute matches for ${engineer.name}:`, msg)
      return NextResponse.json(
        { error: `Match computation failed: ${msg}` },
        { status: 500 },
      )
    } finally {
      computingSet.delete(id)
    }
  })
}
