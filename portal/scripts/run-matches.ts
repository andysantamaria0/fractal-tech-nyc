/**
 * One-off script to compute job matches for a specific engineer profile.
 * Usage: npx tsx scripts/run-matches.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { scoreJobForEngineer } from '../lib/hiring-spa/job-matching'
import type { EngineerProfileSpa, ScannedJob, DimensionWeights } from '../lib/hiring-spa/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing env vars. Run with: npx tsx scripts/run-matches.ts')
  process.exit(1)
}

// Set for the scoring function
process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY

const PROFILE_ID = '5076e614-228b-4f60-8508-a1fd13451ddc'
const TOP_N = 10
const MIN_DIMENSION_SCORE = 40

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

function computeWeightedScore(
  scores: DimensionWeights,
  priorityRatings: { work_life_balance: number; culture: number; mission_driven: number; technical_challenges: number } | null,
): number {
  if (!priorityRatings) {
    const total = DIMENSION_KEYS.reduce((sum, key) => sum + scores[key], 0)
    return Math.round(total / DIMENSION_KEYS.length)
  }

  const weights: DimensionWeights = {
    mission: priorityRatings.mission_driven,
    technical: priorityRatings.technical_challenges,
    culture: priorityRatings.culture,
    environment: priorityRatings.work_life_balance,
    dna: 3,
  }

  let weightedSum = 0
  let weightTotal = 0
  for (const key of DIMENSION_KEYS) {
    weightedSum += scores[key] * weights[key]
    weightTotal += weights[key]
  }

  return Math.round(weightedSum / (weightTotal || 1))
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Fetch engineer profile
  const { data: engineer, error: engErr } = await supabase
    .from('engineer_profiles_spa')
    .select('*')
    .eq('id', PROFILE_ID)
    .single()

  if (engErr || !engineer) {
    console.error('Profile not found:', engErr?.message)
    process.exit(1)
  }

  console.log(`Engineer: ${engineer.name} (${engineer.status})`)
  console.log(`DNA skills: ${engineer.engineer_dna?.topSkills?.join(', ')}`)
  console.log(`Priorities: ${JSON.stringify(engineer.priority_ratings)}`)
  console.log()

  const typedEngineer = engineer as EngineerProfileSpa

  // Fetch all active jobs
  const { data: allJobs } = await supabase
    .from('scanned_jobs')
    .select('*')
    .eq('is_active', true)

  if (!allJobs || allJobs.length === 0) {
    console.error('No active jobs')
    process.exit(1)
  }

  console.log(`Total active jobs: ${allJobs.length}`)

  // Pre-filter to relevant jobs for nyan's profile:
  // - US-based (NYC, SF, Boston, Remote US/Canada, Austin, etc.)
  // - Not intern, not new grad (he's mid-level)
  // - Consumer-facing / startup companies
  // - Full-stack, ML/AI, product engineering, frontend, backend
  const filtered = allJobs.filter(j => {
    const title = j.job_title.toLowerCase()
    const loc = (j.location || '').toLowerCase()
    const company = j.company_name.toLowerCase()

    // Skip interns and new grads
    if (title.includes('intern') || title.includes('new grad') || title.includes('apprentice') || title.includes('working student') || title.includes('stagiaire')) return false

    // Skip very senior roles
    if (title.includes('principal') || title.includes('staff') || title.includes('director') || title.includes('vp ') || title.includes('head of')) return false

    // Must be relevant tech role
    const isRelevantTitle = (
      title.includes('software engineer') || title.includes('software developer') ||
      title.includes('full stack') || title.includes('fullstack') ||
      title.includes('frontend') || title.includes('front-end') ||
      title.includes('machine learning') || title.includes('ml engineer') ||
      title.includes('ai engineer') || title.includes('product engineer')
    )
    if (!isRelevantTitle) return false

    // Must be in US (or remote US/Canada)
    const isUS = (
      loc.includes('new york') || loc.includes('nyc') || loc.includes('ny') ||
      loc.includes('san francisco') || loc.includes('sf') ||
      loc.includes('boston') || loc.includes('austin') || loc.includes('seattle') ||
      loc.includes('remote') || loc.includes('usa') || loc.includes('united states') ||
      loc.includes('brooklyn') || loc.includes('hybrid') || loc.includes('palo alto') ||
      loc.includes('chicago') || loc.includes('n/a') || loc.includes('na')
    )
    if (!isUS) return false

    return true
  })

  console.log(`Filtered to ${filtered.length} relevant US jobs`)
  console.log()

  // Score each job
  const scored: Array<{
    job: ScannedJob
    scores: DimensionWeights
    reasoning: Record<string, string>
    highlight_quote: string
    overall_score: number
  }> = []

  for (let i = 0; i < filtered.length; i++) {
    const job = filtered[i] as ScannedJob
    process.stdout.write(`[${i + 1}/${filtered.length}] Scoring: ${job.company_name} - ${job.job_title}...`)

    try {
      const result = await scoreJobForEngineer(job, typedEngineer, [])

      // Check minimum threshold
      const belowThreshold = DIMENSION_KEYS.some(
        key => result.scores[key] < MIN_DIMENSION_SCORE,
      )

      if (belowThreshold) {
        console.log(` BELOW THRESHOLD (${Object.entries(result.scores).map(([k, v]) => `${k}:${v}`).join(', ')})`)
        continue
      }

      const overall_score = computeWeightedScore(
        result.scores,
        typedEngineer.priority_ratings,
      )

      scored.push({
        job,
        scores: result.scores,
        reasoning: result.reasoning,
        highlight_quote: result.highlight_quote,
        overall_score,
      })

      console.log(` PASS (overall: ${overall_score}, ${Object.entries(result.scores).map(([k, v]) => `${k}:${v}`).join(', ')})`)
    } catch (err: any) {
      console.log(` ERROR: ${err.message?.slice(0, 80)}`)
    }
  }

  console.log()
  console.log(`=== ${scored.length} jobs passed threshold ===`)

  // Sort and take top N
  scored.sort((a, b) => b.overall_score - a.overall_score)
  const topMatches = scored.slice(0, TOP_N)

  console.log()
  console.log(`=== Top ${topMatches.length} Matches ===`)
  for (const [i, m] of topMatches.entries()) {
    console.log(`\n#${i + 1}: ${m.job.company_name} - ${m.job.job_title} (${m.job.location})`)
    console.log(`   Overall: ${m.overall_score}`)
    console.log(`   Scores: ${Object.entries(m.scores).map(([k, v]) => `${k}:${v}`).join(', ')}`)
    console.log(`   ${m.highlight_quote}`)
  }

  // Insert into database
  const batchId = `eng_${PROFILE_ID.slice(0, 8)}_${Date.now()}`
  const insertData = topMatches.map((m, i) => ({
    engineer_profile_id: PROFILE_ID,
    scanned_job_id: m.job.id,
    overall_score: m.overall_score,
    dimension_scores: m.scores,
    reasoning: m.reasoning,
    highlight_quote: m.highlight_quote,
    display_rank: i + 1,
    batch_id: batchId,
  }))

  if (insertData.length > 0) {
    const { error: insertError } = await supabase
      .from('engineer_job_matches')
      .upsert(insertData, {
        onConflict: 'engineer_profile_id,scanned_job_id',
      })

    if (insertError) {
      console.error('Insert error:', insertError.message)
    } else {
      console.log(`\nInserted ${insertData.length} matches into engineer_job_matches`)
    }
  }
}

main().catch(console.error)
