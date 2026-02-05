import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  ingestJobs,
  deactivateStaleJobs,
  type JobIngestionInput,
  type IngestionResult,
} from '@/lib/job-ingestion'

/**
 * POST /api/jobs/ingest
 *
 * Ingest jobs from external sources (e.g., Job Detective Jr.)
 * Handles deduplication and normalization.
 *
 * Headers:
 *   Authorization: Bearer <JOBS_INGESTION_API_KEY>
 *
 * Body:
 *   {
 *     jobs: JobIngestionInput[],
 *     deactivate_stale?: boolean  // if true, deactivate jobs not seen in 14 days
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     results: IngestionResult[],
 *     summary: { created, updated, duplicate, error }
 *   }
 */
export async function POST(request: Request) {
  try {
    // Authenticate via API key
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.JOBS_INGESTION_API_KEY

    if (!apiKey) {
      console.error('[jobs/ingest] JOBS_INGESTION_API_KEY not configured')
      return NextResponse.json(
        { error: 'Ingestion API not configured' },
        { status: 500 },
      )
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { jobs, deactivate_stale } = body as {
      jobs: JobIngestionInput[]
      deactivate_stale?: boolean
    }

    if (!Array.isArray(jobs)) {
      return NextResponse.json(
        { error: 'jobs must be an array' },
        { status: 400 },
      )
    }

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: { created: 0, updated: 0, duplicate: 0, error: 0 },
      })
    }

    if (jobs.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 jobs per request' },
        { status: 400 },
      )
    }

    const serviceClient = await createServiceClient()

    console.log(`[jobs/ingest] Processing ${jobs.length} jobs...`)

    const results = await ingestJobs(jobs, serviceClient)

    // Compute summary
    const summary = {
      created: 0,
      updated: 0,
      duplicate: 0,
      error: 0,
    }

    for (const result of results) {
      summary[result.status]++
    }

    console.log(`[jobs/ingest] Done: ${summary.created} created, ${summary.updated} updated, ${summary.duplicate} duplicate, ${summary.error} error`)

    // Optionally deactivate stale jobs
    let deactivated = 0
    if (deactivate_stale) {
      deactivated = await deactivateStaleJobs(serviceClient)
      console.log(`[jobs/ingest] Deactivated ${deactivated} stale jobs`)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        ...summary,
        ...(deactivate_stale ? { deactivated } : {}),
      },
    })
  } catch (err) {
    console.error('[jobs/ingest] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/jobs/ingest
 *
 * Returns API info and stats.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.JOBS_INGESTION_API_KEY

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const { count: totalJobs } = await serviceClient
    .from('scanned_jobs')
    .select('*', { count: 'exact', head: true })

  const { count: activeJobs } = await serviceClient
    .from('scanned_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: sources } = await serviceClient
    .from('scanned_jobs')
    .select('job_board_source')
    .eq('is_active', true)

  const sourceCounts: Record<string, number> = {}
  for (const row of sources || []) {
    const source = row.job_board_source || 'unknown'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  }

  return NextResponse.json({
    api: 'jobs/ingest',
    version: '1.0',
    stats: {
      total_jobs: totalJobs,
      active_jobs: activeJobs,
      sources: sourceCounts,
    },
    usage: {
      method: 'POST',
      body: {
        jobs: '[{ company_name, company_domain, job_title, job_url, job_board_source?, location?, date_posted?, description? }]',
        deactivate_stale: 'boolean (optional)',
      },
      max_jobs_per_request: 500,
    },
  })
}
