import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EngineerProfileSpa,
  ScannedJob,
  DimensionWeights,
  MatchReasoning,
  PriorityRatings,
  MatchingPreferences,
} from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

const MIN_DIMENSION_SCORE = 40
const TOP_N = 10
const MAX_JOBS_PER_COMPANY = 2
const SCORING_CONCURRENCY = 5

/**
 * Run async tasks with limited concurrency.
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const p = fn(item).then(result => {
      results.push(result)
    })
    executing.push(p)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const settled = await Promise.race([executing[i], Promise.resolve('pending')])
        if (settled !== 'pending') {
          executing.splice(i, 1)
        }
      }
    }
  }

  await Promise.all(executing)
  return results
}

const SYSTEM_PROMPT = `You are a matching engine for a job platform. Given an engineer's profile and a job posting, score how well the job fits the engineer across 5 dimensions.

Each dimension is scored 0-100:
- mission: How well the company's purpose and what they're building aligns with the engineer's goals and motivations
- technical: How well the job's technical requirements match the engineer's skills, languages, and frameworks
- culture: How well the company culture and work style match what the engineer is looking for
- environment: How well the working environment (remote, team dynamics, management style) matches the engineer's preferences
- dna: How well the role's seniority level, growth trajectory, and scope match the engineer's career stage and aspirations

You MUST respond with valid JSON matching this exact structure:
{
  "scores": {
    "mission": <0-100>,
    "technical": <0-100>,
    "culture": <0-100>,
    "environment": <0-100>,
    "dna": <0-100>
  },
  "reasoning": {
    "mission": "1-2 sentence explanation",
    "technical": "1-2 sentence explanation",
    "culture": "1-2 sentence explanation",
    "environment": "1-2 sentence explanation",
    "dna": "1-2 sentence explanation"
  },
  "highlight_quote": "A compelling 1-sentence summary of why this job is (or isn't) a strong match for this engineer."
}

Guidelines:
- Be calibrated: 80+ means genuinely strong, 50-70 is moderate, below 40 is a poor fit
- Ground scores in specific evidence from both the engineer profile and job description
- Don't inflate scores — honest calibration is more valuable than optimism
- The highlight_quote should be specific and memorable, not generic`

/**
 * Pre-filter jobs based on engineer matching preferences.
 * Removes jobs that match any exclusion rule.
 */
export function filterByPreferences(
  jobs: ScannedJob[],
  prefs: MatchingPreferences | null,
): ScannedJob[] {
  if (!prefs) return jobs

  return jobs.filter(job => {
    // Excluded locations: case-insensitive substring match on job.location
    if (prefs.excluded_locations?.length && job.location) {
      const loc = job.location.toLowerCase()
      if (prefs.excluded_locations.some(ex => loc.includes(ex.toLowerCase()))) {
        return false
      }
    }

    // Excluded companies: case-insensitive exact match on company_name
    if (prefs.excluded_companies?.length) {
      const name = job.company_name.toLowerCase()
      if (prefs.excluded_companies.some(ex => name === ex.toLowerCase())) {
        return false
      }
    }

    // Excluded company domains: case-insensitive exact match on company_domain
    if (prefs.excluded_company_domains?.length) {
      const domain = job.company_domain.toLowerCase()
      if (prefs.excluded_company_domains.some(ex => domain === ex.toLowerCase())) {
        return false
      }
    }

    // Excluded keywords: case-insensitive substring match on title + description
    if (prefs.excluded_keywords?.length) {
      const text = `${job.job_title} ${job.description || ''}`.toLowerCase()
      if (prefs.excluded_keywords.some(ex => text.includes(ex.toLowerCase()))) {
        return false
      }
    }

    return true
  })
}

interface ScoreResult {
  scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string
}

/**
 * Score a single job against a single engineer using Claude.
 */
export async function scoreJobForEngineer(
  job: ScannedJob,
  engineer: EngineerProfileSpa,
  notAFitReasons: string[],
  preferences?: MatchingPreferences | null,
): Promise<ScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Score how well this job fits this engineer.\n\n'

  // Engineer DNA
  if (engineer.engineer_dna) {
    const edna = engineer.engineer_dna
    userPrompt += '## Engineer DNA\n\n'
    userPrompt += `Top Skills: ${edna.topSkills.join(', ')}\n`
    userPrompt += `Languages: ${edna.languages.join(', ')}\n`
    userPrompt += `Frameworks: ${edna.frameworks.join(', ')}\n`
    if (edna.yearsOfExperience) userPrompt += `Experience: ${edna.yearsOfExperience}\n`
    userPrompt += `Seniority Signal: ${edna.senioritySignal}\n`
    if (edna.projectHighlights.length > 0) {
      userPrompt += 'Project Highlights:\n'
      for (const h of edna.projectHighlights) {
        userPrompt += `- ${h}\n`
      }
    }
    if (edna.publicWriting) userPrompt += `Public Writing: ${edna.publicWriting}\n`
    userPrompt += '\n'
  }

  // Engineer Summary
  if (engineer.profile_summary) {
    const es = engineer.profile_summary
    userPrompt += '## Engineer Profile Summary\n\n'
    userPrompt += `Snapshot: ${es.snapshot}\n`
    userPrompt += `Technical Identity: ${es.technicalIdentity}\n`
    userPrompt += `Work Style: ${es.workStyle}\n`
    userPrompt += `Growth Trajectory: ${es.growthTrajectory}\n`
    userPrompt += `Best Fit Signals: ${es.bestFitSignals.join(', ')}\n`
    userPrompt += `Deal Breakers: ${es.dealBreakers.join(', ')}\n\n`
  }

  // Engineer questionnaire answers
  if (engineer.work_preferences) {
    userPrompt += '## Engineer Work Preferences\n\n'
    const wp = engineer.work_preferences
    if (wp.environment_type) userPrompt += `Environment type: ${wp.environment_type}\n`
    if (wp.remote_preference) userPrompt += `Remote preference: ${wp.remote_preference}\n`
    if (wp.ideal_team_dynamic) userPrompt += `Ideal team dynamic: ${wp.ideal_team_dynamic}\n`
    if (wp.management_style) userPrompt += `Management style: ${wp.management_style}\n`
    userPrompt += '\n'
  }

  if (engineer.career_growth) {
    userPrompt += '## Engineer Career Growth\n\n'
    const cg = engineer.career_growth
    if (cg.whats_next) userPrompt += `What's next: ${cg.whats_next}\n`
    if (cg.growth_areas) userPrompt += `Growth areas: ${cg.growth_areas}\n`
    if (cg.exciting_problems) userPrompt += `Exciting problems: ${cg.exciting_problems}\n`
    userPrompt += '\n'
  }

  if (engineer.strengths) {
    userPrompt += '## Engineer Strengths\n\n'
    const s = engineer.strengths
    if (s.genuinely_great_at) userPrompt += `Genuinely great at: ${s.genuinely_great_at}\n`
    if (s.colleagues_come_to_you_for) userPrompt += `Colleagues come for: ${s.colleagues_come_to_you_for}\n`
    userPrompt += '\n'
  }

  if (engineer.deal_breakers) {
    userPrompt += '## Engineer Deal Breakers\n\n'
    const db = engineer.deal_breakers
    if (db.non_negotiables) userPrompt += `Non-negotiables: ${db.non_negotiables}\n`
    if (db.would_make_you_leave) userPrompt += `Would make them leave: ${db.would_make_you_leave}\n`
    userPrompt += '\n'
  }

  // Priority ratings
  if (engineer.priority_ratings) {
    userPrompt += '## Engineer Priority Ratings (1-5 importance)\n\n'
    const pr = engineer.priority_ratings
    userPrompt += `Work-Life Balance: ${pr.work_life_balance}/5\n`
    userPrompt += `Culture: ${pr.culture}/5\n`
    userPrompt += `Mission-Driven: ${pr.mission_driven}/5\n`
    userPrompt += `Technical Challenges: ${pr.technical_challenges}/5\n\n`
  }

  // Engineer matching preferences (things they've explicitly excluded)
  if (preferences) {
    const prefLines: string[] = []
    if (preferences.excluded_locations?.length) {
      prefLines.push(`Excluded locations: ${preferences.excluded_locations.join(', ')}`)
    }
    if (preferences.excluded_companies?.length) {
      prefLines.push(`Excluded companies: ${preferences.excluded_companies.join(', ')}`)
    }
    if (preferences.excluded_keywords?.length) {
      prefLines.push(`Excluded keywords: ${preferences.excluded_keywords.join(', ')}`)
    }
    if (prefLines.length > 0) {
      userPrompt += '## Engineer Matching Preferences (explicit exclusions — score lower if related)\n\n'
      for (const line of prefLines) {
        userPrompt += `- ${line}\n`
      }
      userPrompt += '\n'
    }
  }

  // Past "not a fit" reasons for context
  if (notAFitReasons.length > 0) {
    userPrompt += '## Previous "Not a Fit" Reasons (avoid similar patterns)\n\n'
    for (const reason of notAFitReasons.slice(0, 5)) {
      userPrompt += `- ${reason}\n`
    }
    userPrompt += '\n'
  }

  // Job details
  userPrompt += '## Job Posting\n\n'
  userPrompt += `Title: ${job.job_title}\n`
  userPrompt += `Company: ${job.company_name}\n`
  userPrompt += `Domain: ${job.company_domain}\n`
  if (job.location) userPrompt += `Location: ${job.location}\n`
  if (job.job_board_source) userPrompt += `Source: ${job.job_board_source}\n`
  if (job.description) {
    userPrompt += `\nJob Description:\n${job.description.slice(0, 4000)}\n`
  }
  userPrompt += '\n'

  userPrompt += 'Produce the JSON match scores now.'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let jsonStr = textBlock.text.trim()
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr) as ScoreResult

  if (!parsed.scores || !parsed.reasoning || !parsed.highlight_quote) {
    throw new Error('Match score output missing required fields')
  }

  return parsed
}

/**
 * Compute weighted overall score using priority ratings.
 *
 * Maps priority ratings to dimension weights:
 *   work_life_balance → environment
 *   culture → culture
 *   mission_driven → mission
 *   technical_challenges → technical
 *   dna always at baseline 20%
 */
function computeWeightedScore(
  scores: DimensionWeights,
  priorityRatings: PriorityRatings | null,
): number {
  if (!priorityRatings) {
    // Equal weights if no priority ratings
    const total = DIMENSION_KEYS.reduce((sum, key) => sum + scores[key], 0)
    return Math.round(total / DIMENSION_KEYS.length)
  }

  const weights: DimensionWeights = {
    mission: priorityRatings.mission_driven,
    technical: priorityRatings.technical_challenges,
    culture: priorityRatings.culture,
    environment: priorityRatings.work_life_balance,
    dna: 3, // baseline weight
  }

  let weightedSum = 0
  let weightTotal = 0
  for (const key of DIMENSION_KEYS) {
    weightedSum += scores[key] * weights[key]
    weightTotal += weights[key]
  }

  return Math.round(weightedSum / (weightTotal || 1))
}

/**
 * Compute job matches for an engineer: score all active jobs,
 * apply thresholds, take top 10, persist to DB.
 */
export async function computeMatchesForEngineer(
  engineerProfileId: string,
  serviceClient: SupabaseClient,
): Promise<{ matches: Array<{ scanned_job_id: string; overall_score: number; display_rank: number }> }> {
  // Fetch engineer profile
  const { data: engineer, error: engineerError } = await serviceClient
    .from('engineer_profiles_spa')
    .select('*')
    .eq('id', engineerProfileId)
    .single()

  if (engineerError || !engineer) {
    throw new Error(`Engineer profile not found: ${engineerProfileId}`)
  }

  if (engineer.status !== 'complete') {
    throw new Error(`Engineer profile not complete: ${engineer.status}`)
  }

  const typedEngineer = engineer as EngineerProfileSpa

  // Fetch active scanned jobs
  const { data: jobs, error: jobsError } = await serviceClient
    .from('scanned_jobs')
    .select('*')
    .eq('is_active', true)

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
  }

  if (!jobs || jobs.length === 0) {
    return { matches: [] }
  }

  const typedJobs = jobs as ScannedJob[]

  // Pre-filter jobs based on matching preferences
  const preferences = (typedEngineer.matching_preferences as MatchingPreferences | null) || null
  const filteredJobs = filterByPreferences(typedJobs, preferences)

  // Fetch existing matches to avoid re-scoring
  const { data: existingMatches } = await serviceClient
    .from('engineer_job_matches')
    .select('scanned_job_id')
    .eq('engineer_profile_id', engineerProfileId)

  const existingJobIds = new Set(
    (existingMatches || []).map(m => m.scanned_job_id),
  )

  // Filter to jobs that haven't been scored yet
  const newJobs = filteredJobs.filter(j => !existingJobIds.has(j.id))

  if (newJobs.length === 0) {
    // Return existing top matches
    const { data: topExisting } = await serviceClient
      .from('engineer_job_matches')
      .select('scanned_job_id, overall_score, display_rank')
      .eq('engineer_profile_id', engineerProfileId)
      .is('feedback', null)
      .order('display_rank', { ascending: true })
      .limit(TOP_N)

    return {
      matches: (topExisting || []).map(m => ({
        scanned_job_id: m.scanned_job_id,
        overall_score: m.overall_score,
        display_rank: m.display_rank,
      })),
    }
  }

  // Fetch past "not a fit" feedback reasons for context
  const { data: notAFitMatches } = await serviceClient
    .from('engineer_job_matches')
    .select('feedback_reason')
    .eq('engineer_profile_id', engineerProfileId)
    .eq('feedback', 'not_a_fit')
    .not('feedback_reason', 'is', null)

  const notAFitReasons = (notAFitMatches || [])
    .map(m => m.feedback_reason)
    .filter(Boolean) as string[]

  // Score jobs in parallel with limited concurrency
  type ScoredJob = {
    job: ScannedJob
    scores: DimensionWeights
    reasoning: MatchReasoning
    highlight_quote: string
    overall_score: number
  } | null

  const scoredResults = await parallelMap(
    newJobs,
    async (job): Promise<ScoredJob> => {
      try {
        const result = await scoreJobForEngineer(job, typedEngineer, notAFitReasons, preferences)

        // Check minimum threshold: every dimension must be >= 40
        const belowThreshold = DIMENSION_KEYS.some(
          key => result.scores[key] < MIN_DIMENSION_SCORE,
        )
        if (belowThreshold) return null

        const overall_score = computeWeightedScore(
          result.scores,
          typedEngineer.priority_ratings,
        )

        return {
          job,
          scores: result.scores,
          reasoning: result.reasoning,
          highlight_quote: result.highlight_quote,
          overall_score,
        }
      } catch (err) {
        console.error(`Failed to score job ${job.id} for engineer ${engineerProfileId}:`, err)
        return null
      }
    },
    SCORING_CONCURRENCY,
  )

  // Filter out nulls (failed or below threshold)
  const scored = scoredResults.filter((r): r is NonNullable<ScoredJob> => r !== null)

  // Sort by overall score descending
  scored.sort((a, b) => b.overall_score - a.overall_score)

  // Limit to MAX_JOBS_PER_COMPANY per company (by domain) to ensure variety
  const companyCount = new Map<string, number>()
  const diversifiedMatches = scored.filter(m => {
    const domain = m.job.company_domain.toLowerCase()
    const count = companyCount.get(domain) || 0
    if (count >= MAX_JOBS_PER_COMPANY) return false
    companyCount.set(domain, count + 1)
    return true
  })

  // Take top N from diversified list
  const topMatches = diversifiedMatches.slice(0, TOP_N)

  // Generate a batch ID for this computation
  const batchId = `eng_${engineerProfileId.slice(0, 8)}_${Date.now()}`

  // Upsert new matches
  const insertData = topMatches.map((m, i) => ({
    engineer_profile_id: engineerProfileId,
    scanned_job_id: m.job.id,
    overall_score: m.overall_score,
    dimension_scores: m.scores,
    reasoning: m.reasoning,
    highlight_quote: m.highlight_quote,
    display_rank: i + 1,
    batch_id: batchId,
  }))

  if (insertData.length > 0) {
    const { error: insertError } = await serviceClient
      .from('engineer_job_matches')
      .upsert(insertData, {
        onConflict: 'engineer_profile_id,scanned_job_id',
      })

    if (insertError) {
      throw new Error(`Failed to insert matches: ${insertError.message}`)
    }
  }

  return {
    matches: topMatches.map((m, i) => ({
      scanned_job_id: m.job.id,
      overall_score: m.overall_score,
      display_rank: i + 1,
    })),
  }
}
