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

// Two-stage scoring: rule-based pre-filter, then Sonnet for detailed scoring
const MODEL_DETAILED = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

const MIN_DIMENSION_SCORE = 40
const TOP_N = 10
const MAX_JOBS_PER_COMPANY = 2
const SCORING_CONCURRENCY = 5 // keep under Anthropic 50 RPM rate limit
const PREFILTER_TOP_N = 20 // how many jobs pass to detailed scoring

// Recency boost: jobs posted recently get a score bump
const RECENCY_BOOST_MAX = 5 // max points added for brand new jobs
const RECENCY_BOOST_DAYS = 14 // boost tapers to 0 over this many days

// If technical score is below this, cap the overall score so a bad role fit
// can't be masked by strong culture/environment/dna dimensions.
const TECHNICAL_SOFT_FLOOR = 50
const TECHNICAL_FLOOR_CAP = 50 // max overall score when technical < TECHNICAL_SOFT_FLOOR

/**
 * Calculate recency boost based on job posting date.
 * Returns 0-RECENCY_BOOST_MAX points, tapering linearly over RECENCY_BOOST_DAYS.
 */
function getRecencyBoost(job: ScannedJob): number {
  const dateStr = job.date_posted || job.first_seen_at
  if (!dateStr) return 0

  const postDate = new Date(dateStr)
  const now = new Date()
  const daysOld = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysOld <= 0) return RECENCY_BOOST_MAX
  if (daysOld >= RECENCY_BOOST_DAYS) return 0

  // Linear taper
  return Math.round(RECENCY_BOOST_MAX * (1 - daysOld / RECENCY_BOOST_DAYS))
}

/**
 * Rule-based pre-filter: score jobs by keyword/skill overlap with engineer.
 * No API calls — instant, no rate limits, deterministic.
 * Returns 0-100 score based on how many engineer skills appear in the job text.
 */
function prefilterJobRuleBased(
  job: ScannedJob,
  engineerKeywords: string[],
): number {
  if (engineerKeywords.length === 0) return 50 // no data, neutral score

  const jobText = `${job.job_title} ${job.description || ''}`.toLowerCase()
  let hits = 0
  for (const kw of engineerKeywords) {
    if (jobText.includes(kw.toLowerCase())) hits++
  }
  // Scale: 0 hits = 20, all hits = 95
  return Math.min(95, 20 + Math.round((hits / engineerKeywords.length) * 75))
}

/**
 * Collect all searchable keywords from an engineer's profile.
 */
function getEngineerKeywords(engineer: EngineerProfileSpa): string[] {
  const keywords: string[] = []
  if (engineer.engineer_dna) {
    keywords.push(...(engineer.engineer_dna.topSkills || []))
    keywords.push(...(engineer.engineer_dna.languages || []))
    keywords.push(...(engineer.engineer_dna.frameworks || []))
  }
  if (engineer.profile_summary?.bestFitSignals) {
    keywords.push(...engineer.profile_summary.bestFitSignals)
  }
  return keywords
}

/**
 * Run async tasks with limited concurrency.
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

// Questionnaire section keys that map to dimensions
const QUESTIONNAIRE_SECTION_KEYS = [
  'work_preferences',
  'career_growth',
  'strengths',
  'growth_areas',
  'deal_breakers',
] as const

// Dimensions that depend on questionnaire data (not just engineer_dna)
const QUESTIONNAIRE_DEPENDENT_DIMENSIONS: (keyof DimensionWeights)[] = [
  'culture', 'environment', 'dna',
]

/**
 * Check which questionnaire sections have actual non-empty content.
 * Returns the count of filled sections and list of empty section keys.
 */
function getQuestionnaireCompleteness(engineer: EngineerProfileSpa): {
  filledSections: number
  totalSections: number
  isSparse: boolean
} {
  let filled = 0
  for (const key of QUESTIONNAIRE_SECTION_KEYS) {
    const section = engineer[key] as Record<string, string> | null
    if (section && Object.values(section).some(v => typeof v === 'string' && v.trim().length > 0)) {
      filled++
    }
  }
  return {
    filledSections: filled,
    totalSections: QUESTIONNAIRE_SECTION_KEYS.length,
    isSparse: filled < 3,
  }
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
- For the technical dimension, shared programming languages alone do NOT make a good match. You must consider the actual domain expertise required (e.g. graphics/3D, embedded systems, ML/AI, game engines, compilers vs. web applications, mobile, data engineering). A web app engineer who knows TypeScript is NOT a technical match for a role requiring TypeScript in game engine tooling, lighting systems, or compilers. Score below 40 when the core domain is outside the engineer's experience, regardless of language overlap.
- When no preference data exists for a dimension (e.g. culture, environment), score 50 (neutral) rather than scoring low. Only score below 50 when there is concrete evidence of a mismatch.
- The highlight_quote should be specific and memorable, not generic`

// Map shorthand location names to patterns for matching
const LOCATION_PATTERNS: Record<string, string[]> = {
  'nyc': ['new york', 'nyc', 'brooklyn', 'manhattan'],
  'sf': ['san francisco', 'sf', 'bay area'],
  'remote': ['remote'],
  'la': ['los angeles', 'la'],
  'austin': ['austin'],
  'boston': ['boston'],
  'seattle': ['seattle'],
  'chicago': ['chicago'],
  'denver': ['denver'],
  'miami': ['miami'],
}

/**
 * Filter jobs by engineer's preferred locations.
 * If no preferences set, returns all jobs.
 * Remote jobs always pass if engineer selected Remote.
 */
export function filterByPreferredLocations(
  jobs: ScannedJob[],
  preferredLocations: string[] | null,
): ScannedJob[] {
  if (!preferredLocations || preferredLocations.length === 0) return jobs

  const wantsRemote = preferredLocations.some(loc => loc.toLowerCase() === 'remote')

  return jobs.filter(job => {
    const jobLoc = (job.location || '').toLowerCase()

    // If job is remote and engineer wants remote, always include
    if (wantsRemote && jobLoc.includes('remote')) {
      return true
    }

    // Check if job location matches any preferred location
    for (const pref of preferredLocations) {
      const prefLower = pref.toLowerCase()

      // Try known patterns first
      const patterns = LOCATION_PATTERNS[prefLower]
      if (patterns) {
        if (patterns.some(p => jobLoc.includes(p))) {
          return true
        }
      } else {
        // Custom location - direct substring match
        if (jobLoc.includes(prefLower)) {
          return true
        }
      }
    }

    return false
  })
}

/**
 * Normalize a job title for comparison (lowercase, remove common suffixes/prefixes).
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[-–—]\s*/g, ' ') // normalize dashes
    .replace(/\s*(sr\.?|senior|jr\.?|junior|lead|staff|principal|intern)\s*/gi, ' ')
    .replace(/\s*(i|ii|iii|iv|v|1|2|3|4|5)\s*$/gi, '') // remove level suffixes
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Deduplicate jobs from the same company with very similar titles.
 * Keeps the most recent posting (by date_posted or first_seen_at).
 */
export function deduplicateJobs(jobs: ScannedJob[]): ScannedJob[] {
  // Group by company domain + normalized title
  const groups = new Map<string, ScannedJob[]>()

  for (const job of jobs) {
    const key = `${job.company_domain.toLowerCase()}::${normalizeTitle(job.job_title)}`
    const existing = groups.get(key) || []
    existing.push(job)
    groups.set(key, existing)
  }

  // From each group, keep the most recent job
  const deduplicated: ScannedJob[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      deduplicated.push(group[0])
    } else {
      // Sort by date (most recent first) and keep the first
      group.sort((a, b) => {
        const dateA = new Date(a.date_posted || a.first_seen_at).getTime()
        const dateB = new Date(b.date_posted || b.first_seen_at).getTime()
        return dateB - dateA
      })
      deduplicated.push(group[0])
    }
  }

  return deduplicated
}

// Tech stacks that are generally incompatible (if job requires one, engineer with the other is poor fit)
const INCOMPATIBLE_STACKS: Record<string, string[]> = {
  // Backend language families
  'java': ['spring', 'kotlin', 'scala', 'jvm'],
  'c#': ['.net', 'dotnet', 'asp.net', 'unity'],
  'go': ['golang'],
  'rust': [],
  'php': ['laravel', 'symfony', 'wordpress'],
  'ruby': ['rails', 'ruby on rails'],
  // Frontend
  'angular': ['angularjs'],
  'vue': ['vuejs', 'vue.js', 'nuxt'],
  // Mobile
  'swift': ['ios', 'swiftui', 'uikit'],
  'objective-c': ['ios'],
  'kotlin': ['android'],
  'flutter': ['dart'],
  'react native': ['react-native'],
}

// Languages/frameworks that are commonly interchangeable or complementary
const COMPATIBLE_SKILLS = new Set([
  'javascript', 'typescript', 'react', 'node', 'nodejs', 'next', 'nextjs',
  'python', 'django', 'flask', 'fastapi',
  'sql', 'postgresql', 'postgres', 'mysql', 'mongodb',
  'aws', 'gcp', 'azure', 'cloud',
  'docker', 'kubernetes', 'k8s',
])

/**
 * Filter out jobs that require incompatible tech stacks.
 * If engineer knows React/TypeScript, skip jobs requiring Java/C#.
 */
export function filterByTechStack(
  jobs: ScannedJob[],
  engineerSkills: string[],
): ScannedJob[] {
  if (!engineerSkills || engineerSkills.length === 0) return jobs

  const engineerSkillsLower = new Set(engineerSkills.map(s => s.toLowerCase()))

  // Determine which incompatible stacks to filter out
  const stacksToExclude = new Set<string>()

  for (const [stack, aliases] of Object.entries(INCOMPATIBLE_STACKS)) {
    // Check if engineer has this stack
    const hasStack = engineerSkillsLower.has(stack) ||
      aliases.some(a => engineerSkillsLower.has(a))

    if (!hasStack) {
      // Engineer doesn't have this stack - mark it for exclusion
      stacksToExclude.add(stack)
      aliases.forEach(a => stacksToExclude.add(a))
    }
  }

  return jobs.filter(job => {
    const jobText = `${job.job_title} ${job.description || ''}`.toLowerCase()

    // Check if job strongly requires an excluded stack
    for (const stack of stacksToExclude) {
      // Look for strong requirement signals (not just mentions)
      const patterns = [
        new RegExp(`\\b${stack}\\s+(developer|engineer|expert)`, 'i'),
        new RegExp(`(senior|staff|lead)\\s+${stack}`, 'i'),
        new RegExp(`\\brequired?:\\s*[^.]*\\b${stack}\\b`, 'i'),
        new RegExp(`\\bmust\\s+(have|know)\\s+[^.]*\\b${stack}\\b`, 'i'),
      ]

      if (patterns.some(p => p.test(jobText))) {
        return false
      }
    }

    return true
  })
}

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

  // Sparse data annotation
  const completeness = getQuestionnaireCompleteness(engineer)
  if (completeness.isSparse) {
    userPrompt += '## Note on Data Completeness\n\n'
    userPrompt += `This engineer has only filled ${completeness.filledSections} of ${completeness.totalSections} questionnaire sections. `
    userPrompt += 'For dimensions where no preference data exists (culture, environment, dna), score 50 (neutral) rather than penalizing. '
    userPrompt += 'Only deviate from 50 when there is concrete evidence from the available data.\n\n'
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
    model: MODEL_DETAILED,
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

  let parsed: ScoreResult
  try {
    parsed = JSON.parse(jsonStr) as ScoreResult
  } catch {
    throw new Error(`Failed to parse scoring JSON: ${jsonStr.slice(0, 200)}`)
  }

  if (!parsed.scores || !parsed.reasoning || !parsed.highlight_quote) {
    throw new Error('Match score output missing required fields')
  }

  // Clamp all dimension scores to [0, 100]
  for (const key of DIMENSION_KEYS) {
    if (typeof parsed.scores[key] === 'number') {
      parsed.scores[key] = Math.max(0, Math.min(100, Math.round(parsed.scores[key])))
    } else {
      parsed.scores[key] = 0
    }
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
 *
 * If learnedAdjustments provided, applies multipliers based on feedback history.
 */
function computeWeightedScore(
  scores: DimensionWeights,
  priorityRatings: PriorityRatings | null,
  learnedAdjustments?: DimensionWeights | null,
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

  // Apply learned adjustments if available (multipliers centered at 1.0)
  if (learnedAdjustments) {
    for (const key of DIMENSION_KEYS) {
      weights[key] *= learnedAdjustments[key]
    }
  }

  let weightedSum = 0
  let weightTotal = 0
  for (const key of DIMENSION_KEYS) {
    weightedSum += scores[key] * weights[key]
    weightTotal += weights[key]
  }

  return Math.round(weightedSum / (weightTotal || 1))
}

interface FeedbackMatch {
  feedback: 'applied' | 'not_a_fit'
  dimension_scores: DimensionWeights
}

/**
 * Compute learned weight adjustments from engineer's feedback history.
 * Returns multipliers for each dimension (1.0 = no change, >1 = boost, <1 = reduce).
 *
 * Logic: Dimensions that score high on "applied" jobs and low on "not_a_fit" jobs
 * are better predictors and get boosted. Dimensions that mislead (high on not_a_fit)
 * get reduced.
 */
function computeLearnedAdjustments(feedbackHistory: FeedbackMatch[]): DimensionWeights | null {
  if (feedbackHistory.length < 3) return null // need minimum feedback to learn

  const appliedScores: Record<keyof DimensionWeights, number[]> = {
    mission: [], technical: [], culture: [], environment: [], dna: [],
  }
  const notFitScores: Record<keyof DimensionWeights, number[]> = {
    mission: [], technical: [], culture: [], environment: [], dna: [],
  }

  for (const match of feedbackHistory) {
    const target = match.feedback === 'applied' ? appliedScores : notFitScores
    for (const key of DIMENSION_KEYS) {
      target[key].push(match.dimension_scores[key])
    }
  }

  // Need at least 1 applied to learn from
  const hasApplied = appliedScores.mission.length > 0
  if (!hasApplied) return null

  const adjustments: DimensionWeights = {
    mission: 1, technical: 1, culture: 1, environment: 1, dna: 1,
  }

  for (const key of DIMENSION_KEYS) {
    const appliedAvg = appliedScores[key].length > 0
      ? appliedScores[key].reduce((a, b) => a + b, 0) / appliedScores[key].length
      : 50
    const notFitAvg = notFitScores[key].length > 0
      ? notFitScores[key].reduce((a, b) => a + b, 0) / notFitScores[key].length
      : 50

    // If dimension scores higher on applied than not_a_fit, boost it
    // Adjustment range: 0.7 to 1.3
    const diff = (appliedAvg - notFitAvg) / 100 // -1 to 1 range
    adjustments[key] = Math.max(0.7, Math.min(1.3, 1 + diff * 0.3))
  }

  return adjustments
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
    .from('engineers')
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

  // Pre-filter jobs based on matching preferences (exclusions)
  const preferences = (typedEngineer.matching_preferences as MatchingPreferences | null) || null
  const afterExclusions = filterByPreferences(typedJobs, preferences)

  // Filter by preferred locations (inclusions)
  const afterLocations = filterByPreferredLocations(afterExclusions, typedEngineer.preferred_locations)

  // Deduplicate similar jobs from same company
  const afterDedup = deduplicateJobs(afterLocations)

  // Filter by tech stack compatibility
  const engineerSkills = [
    ...(typedEngineer.engineer_dna?.languages || []),
    ...(typedEngineer.engineer_dna?.frameworks || []),
    ...(typedEngineer.engineer_dna?.topSkills || []),
  ]
  const filteredJobs = filterByTechStack(afterDedup, engineerSkills)

  // Fetch existing matches to avoid re-scoring
  const { data: existingMatches } = await serviceClient
    .from('engineer_job_matches')
    .select('scanned_job_id')
    .eq('engineer_id', engineerProfileId)

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
      .eq('engineer_id', engineerProfileId)
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
    .eq('engineer_id', engineerProfileId)
    .eq('feedback', 'not_a_fit')
    .not('feedback_reason', 'is', null)

  const notAFitReasons = (notAFitMatches || [])
    .map(m => m.feedback_reason)
    .filter(Boolean) as string[]

  // Fetch feedback history to compute learned weight adjustments
  const { data: feedbackMatches } = await serviceClient
    .from('engineer_job_matches')
    .select('feedback, dimension_scores')
    .eq('engineer_id', engineerProfileId)
    .not('feedback', 'is', null)

  const feedbackHistory: FeedbackMatch[] = (feedbackMatches || [])
    .filter(m => m.feedback && m.dimension_scores)
    .map(m => ({
      feedback: m.feedback as 'applied' | 'not_a_fit',
      dimension_scores: m.dimension_scores as DimensionWeights,
    }))

  const learnedAdjustments = computeLearnedAdjustments(feedbackHistory)
  if (learnedAdjustments) {
    console.log(`[job-matching] Using learned adjustments from ${feedbackHistory.length} feedback items`)
  }

  // STAGE 1: Rule-based pre-filter (no API calls, instant)
  const engineerKeywords = getEngineerKeywords(typedEngineer)
  console.log(`[job-matching] Pre-filtering ${newJobs.length} jobs by keyword overlap (${engineerKeywords.length} keywords)...`)

  const prefilterResults = newJobs.map(job => ({
    job,
    score: prefilterJobRuleBased(job, engineerKeywords),
  }))

  prefilterResults.sort((a, b) => b.score - a.score)
  const candidatesForDetailed = prefilterResults
    .slice(0, PREFILTER_TOP_N)
    .map(r => r.job)

  console.log(`[job-matching] Top ${candidatesForDetailed.length} jobs selected for detailed scoring...`)

  // Initialize Anthropic client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  // STAGE 2: Detailed scoring with Sonnet on pre-filtered candidates
  type ScoredJob = {
    job: ScannedJob
    scores: DimensionWeights
    reasoning: MatchReasoning
    highlight_quote: string
    overall_score: number
  } | null

  const scoredResults = await parallelMap(
    candidatesForDetailed,
    async (job): Promise<ScoredJob> => {
      try {
        const result = await scoreJobForEngineer(job, typedEngineer, notAFitReasons, preferences)

        // Check minimum threshold: every dimension must be >= 40
        // For sparse profiles, skip threshold on questionnaire-dependent dimensions
        // that lack source data. Always enforce on technical and mission.
        const completeness = getQuestionnaireCompleteness(typedEngineer)
        const belowThreshold = DIMENSION_KEYS.some(key => {
          if (result.scores[key] >= MIN_DIMENSION_SCORE) return false
          // For sparse profiles, only enforce threshold on data-backed dimensions
          if (completeness.isSparse && QUESTIONNAIRE_DEPENDENT_DIMENSIONS.includes(key)) {
            return false
          }
          return true
        })
        if (belowThreshold) return null

        const baseScore = computeWeightedScore(
          result.scores,
          typedEngineer.priority_ratings,
          learnedAdjustments,
        )
        const recencyBoost = getRecencyBoost(job)
        let overall_score = Math.max(0, Math.min(100, baseScore + recencyBoost))

        // Cap overall score when technical fit is weak — a great company with
        // the wrong role shouldn't surface as a strong match
        if (result.scores.technical < TECHNICAL_SOFT_FLOOR) {
          overall_score = Math.min(overall_score, TECHNICAL_FLOOR_CAP)
        }

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
    engineer_id: engineerProfileId,
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
        onConflict: 'engineer_id,scanned_job_id',
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
