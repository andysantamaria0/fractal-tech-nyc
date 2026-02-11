/**
 * Re-generate Ethan's profile summary and re-compute his matches.
 * Usage: npx tsx scripts/recompute-ethan-matches.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { generateEngineerProfileSummary } from '../lib/hiring-spa/engineer-summary'
import { computeMatchesForEngineer } from '../lib/hiring-spa/job-matching'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY || !process.env.ANTHROPIC_API_KEY) {
  console.error('Missing env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY)')
  process.exit(1)
}

const EMAIL = 'ethana@ethananderson.net'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Fetch Ethan's full profile
  const { data: eng, error } = await supabase
    .from('engineers')
    .select('*')
    .ilike('email', EMAIL)
    .single()

  if (error || !eng) {
    console.error('Not found:', error?.message)
    process.exit(1)
  }

  console.log(`Engineer: ${eng.name} (${eng.status})`)
  console.log()

  // Step 1: Re-generate profile summary
  console.log('=== Step 1: Re-generating profile summary ===')
  const summary = await generateEngineerProfileSummary({
    engineerDna: eng.engineer_dna,
    workPreferences: eng.work_preferences,
    careerGrowth: eng.career_growth,
    strengths: eng.strengths,
    growthAreas: eng.growth_areas,
    dealBreakers: eng.deal_breakers,
  })

  console.log('New snapshot:', summary.snapshot)
  console.log('New bestFitSignals:', JSON.stringify(summary.bestFitSignals, null, 2))
  console.log()

  const { error: saveErr } = await supabase
    .from('engineers')
    .update({ profile_summary: summary })
    .eq('id', eng.id)

  if (saveErr) {
    console.error('Save error:', saveErr.message)
    process.exit(1)
  }
  console.log('Profile summary saved.')
  console.log()

  // Clear old unreviewed matches so they get re-scored
  const { error: delErr } = await supabase
    .from('engineer_job_matches')
    .delete()
    .eq('engineer_id', eng.id)
    .is('feedback', null)

  if (delErr) {
    console.error('Delete old matches error:', delErr.message)
  } else {
    console.log('Cleared old unreviewed matches.')
  }
  console.log()

  // Step 2: Compute matches
  console.log('=== Step 2: Computing matches ===')
  const result = await computeMatchesForEngineer(eng.id, supabase)
  console.log()
  console.log(`=== Results: ${result.matches.length} matches ===`)
  for (const m of result.matches) {
    console.log(`  #${m.display_rank} score=${m.overall_score} job=${m.scanned_job_id}`)
  }
}

main().catch(console.error)
