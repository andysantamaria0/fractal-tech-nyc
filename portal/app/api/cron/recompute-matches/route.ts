import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'

// Cron endpoint: re-match all complete engineers against new jobs.
// The matching function skips previously-scored jobs, so only new
// jobs added since the last run get scored.
// Vercel Cron sends GET requests.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Fetch all engineers with complete profiles
    const { data: engineers, error } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id, name')
      .eq('status', 'complete')

    if (error) {
      console.error('[cron/recompute-matches] Failed to fetch engineers:', error.message)
      return NextResponse.json({ error: 'Failed to fetch engineers' }, { status: 500 })
    }

    if (!engineers || engineers.length === 0) {
      console.log('[cron/recompute-matches] No complete engineer profiles found')
      return NextResponse.json({ processed: 0 })
    }

    console.log(`[cron/recompute-matches] Processing ${engineers.length} engineers`)

    const results: { id: string; name: string; newMatches: number; error?: string }[] = []

    for (const eng of engineers) {
      try {
        const result = await computeMatchesForEngineer(eng.id, serviceClient)
        const newMatches = result.matches.length
        console.log(`[cron/recompute-matches] ${eng.name}: ${newMatches} matches`)
        results.push({ id: eng.id, name: eng.name, newMatches })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[cron/recompute-matches] ${eng.name} failed:`, msg)
        results.push({ id: eng.id, name: eng.name, newMatches: 0, error: msg })
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.newMatches, 0)
    console.log(`[cron/recompute-matches] Done. ${results.length} engineers, ${totalNew} total matches updated`)

    return NextResponse.json({
      processed: results.length,
      totalNewMatches: totalNew,
      results,
    })
  } catch (err) {
    console.error('[cron/recompute-matches] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
