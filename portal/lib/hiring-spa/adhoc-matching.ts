import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EngineerProfileSpa,
  ExtractedJD,
  DimensionWeights,
  MatchReasoning,
  AdHocMatch,
} from './types'
import { extractFromUrl } from './jd-extract'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096
const SCORING_CONCURRENCY = 5

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

const SYSTEM_PROMPT = `You are a matching engine for a job platform. Given an engineer's profile and a job description, score how well the job fits the engineer across 5 dimensions.

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
- You are working from raw JD text only — there is no company profile available, so infer mission, culture, and environment signals from the JD itself.
- When the JD lacks clear signal for a dimension, score conservatively in the 45-55 range rather than guessing.
- Be calibrated: 80+ means genuinely strong, 50-70 is moderate, below 40 is a poor fit
- Ground scores in specific evidence from both the engineer profile and job description
- Don't inflate scores — honest calibration is more valuable than optimism
- The highlight_quote should be specific and memorable, not generic`

interface ScoreResult {
  scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string
}

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

function buildEngineerPrompt(engineer: EngineerProfileSpa): string {
  let prompt = ''

  if (engineer.engineer_dna) {
    const edna = engineer.engineer_dna
    prompt += '## Engineer DNA\n\n'
    prompt += `Top Skills: ${edna.topSkills.join(', ')}\n`
    prompt += `Languages: ${edna.languages.join(', ')}\n`
    prompt += `Frameworks: ${edna.frameworks.join(', ')}\n`
    if (edna.yearsOfExperience) prompt += `Experience: ${edna.yearsOfExperience}\n`
    prompt += `Seniority Signal: ${edna.senioritySignal}\n`
    if (edna.projectHighlights.length > 0) {
      prompt += 'Project Highlights:\n'
      for (const h of edna.projectHighlights) {
        prompt += `- ${h}\n`
      }
    }
    if (edna.publicWriting) prompt += `Public Writing: ${edna.publicWriting}\n`
    prompt += '\n'
  }

  if (engineer.profile_summary) {
    const es = engineer.profile_summary
    prompt += '## Engineer Profile Summary\n\n'
    prompt += `Snapshot: ${es.snapshot}\n`
    prompt += `Technical Identity: ${es.technicalIdentity}\n`
    prompt += `Work Style: ${es.workStyle}\n`
    prompt += `Growth Trajectory: ${es.growthTrajectory}\n`
    prompt += `Best Fit Signals: ${es.bestFitSignals.join(', ')}\n`
    prompt += `Deal Breakers: ${es.dealBreakers.join(', ')}\n\n`
  }

  if (engineer.work_preferences) {
    prompt += '## Engineer Work Preferences\n\n'
    const wp = engineer.work_preferences
    if (wp.environment_type) prompt += `Environment type: ${wp.environment_type}\n`
    if (wp.remote_preference) prompt += `Remote preference: ${wp.remote_preference}\n`
    if (wp.ideal_team_dynamic) prompt += `Ideal team dynamic: ${wp.ideal_team_dynamic}\n`
    if (wp.management_style) prompt += `Management style: ${wp.management_style}\n`
    prompt += '\n'
  }

  if (engineer.career_growth) {
    prompt += '## Engineer Career Growth\n\n'
    const cg = engineer.career_growth
    if (cg.whats_next) prompt += `What's next: ${cg.whats_next}\n`
    if (cg.growth_areas) prompt += `Growth areas: ${cg.growth_areas}\n`
    if (cg.exciting_problems) prompt += `Exciting problems: ${cg.exciting_problems}\n`
    prompt += '\n'
  }

  if (engineer.strengths) {
    prompt += '## Engineer Strengths\n\n'
    const s = engineer.strengths
    if (s.genuinely_great_at) prompt += `Genuinely great at: ${s.genuinely_great_at}\n`
    if (s.colleagues_come_to_you_for) prompt += `Colleagues come for: ${s.colleagues_come_to_you_for}\n`
    prompt += '\n'
  }

  if (engineer.deal_breakers) {
    prompt += '## Engineer Deal Breakers\n\n'
    const db = engineer.deal_breakers
    if (db.non_negotiables) prompt += `Non-negotiables: ${db.non_negotiables}\n`
    if (db.would_make_you_leave) prompt += `Would make them leave: ${db.would_make_you_leave}\n`
    prompt += '\n'
  }

  if (engineer.priority_ratings) {
    prompt += '## Engineer Priority Ratings (1-5 importance)\n\n'
    const pr = engineer.priority_ratings
    prompt += `Work-Life Balance: ${pr.work_life_balance}/5\n`
    prompt += `Culture: ${pr.culture}/5\n`
    prompt += `Mission-Driven: ${pr.mission_driven}/5\n`
    prompt += `Technical Challenges: ${pr.technical_challenges}/5\n\n`
  }

  return prompt
}

export async function scoreEngineerForJD(
  extractedJD: ExtractedJD,
  engineer: EngineerProfileSpa,
): Promise<ScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Score how well this job fits this engineer.\n\n'
  userPrompt += buildEngineerPrompt(engineer)

  userPrompt += '## Job Description\n\n'
  userPrompt += `Title: ${extractedJD.title}\n`
  if (extractedJD.location) {
    userPrompt += `Location: ${extractedJD.location}\n`
  }
  if (extractedJD.sections && extractedJD.sections.length > 1) {
    // Use structured sections for better signal
    userPrompt += '\n'
    for (const section of extractedJD.sections) {
      userPrompt += `### ${section.heading}\n${section.content.slice(0, 1500)}\n\n`
    }
  } else if (extractedJD.raw_text) {
    userPrompt += `\n${extractedJD.raw_text.slice(0, 8000)}\n`
  }
  userPrompt += '\nProduce the JSON match scores now.'

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
  if (fenceMatch) jsonStr = fenceMatch[1].trim()

  let parsed: ScoreResult
  try {
    parsed = JSON.parse(jsonStr) as ScoreResult
  } catch {
    throw new Error(`Failed to parse scoring JSON: ${jsonStr.slice(0, 200)}`)
  }

  if (!parsed.scores || !parsed.reasoning || !parsed.highlight_quote) {
    throw new Error('Match score output missing required fields')
  }

  for (const key of DIMENSION_KEYS) {
    if (typeof parsed.scores[key] === 'number') {
      parsed.scores[key] = Math.max(0, Math.min(100, Math.round(parsed.scores[key])))
    } else {
      parsed.scores[key] = 0
    }
  }

  return parsed
}

const MIN_JD_TEXT_LENGTH = 100

export async function computeAdHocMatches(
  jdUrl: string,
  engineerIds: string[],
  adminUserId: string | undefined,
  serviceClient: SupabaseClient,
  preExtractedJD?: ExtractedJD,
): Promise<AdHocMatch[]> {
  const extractedJD = preExtractedJD || await extractFromUrl(jdUrl)

  if (!extractedJD.raw_text || extractedJD.raw_text.length < MIN_JD_TEXT_LENGTH) {
    throw new Error(
      `JD extraction returned insufficient content (${extractedJD.raw_text?.length || 0} chars). ` +
      `The page may be a client-rendered SPA that cannot be scraped server-side. ` +
      `Try pasting the JD text directly.`
    )
  }

  const { data: engineers, error: engError } = await serviceClient
    .from('engineers')
    .select('*')
    .in('id', engineerIds)

  if (engError || !engineers) {
    throw new Error('Failed to fetch engineer profiles')
  }

  const results = await parallelMap(
    engineers as EngineerProfileSpa[],
    async (engineer) => {
      try {
        const scored = await scoreEngineerForJD(extractedJD, engineer)
        const overall = Math.round(
          DIMENSION_KEYS.reduce((sum, key) => sum + scored.scores[key], 0) / DIMENSION_KEYS.length,
        )
        return { engineer, scored, overall }
      } catch (err) {
        console.error(`[adhoc-match] Failed to score engineer ${engineer.name}:`, err instanceof Error ? err.message : err)
        return null
      }
    },
    SCORING_CONCURRENCY,
  )

  const succeeded = results.filter((r): r is NonNullable<typeof r> => r !== null)
  if (succeeded.length === 0) {
    throw new Error('All scoring attempts failed')
  }

  const rows = succeeded.map(({ engineer, scored, overall }) => ({
    jd_url: jdUrl,
    jd_title: extractedJD.title,
    jd_raw_text: extractedJD.raw_text,
    jd_sections: extractedJD.sections,
    source_platform: extractedJD.source_platform || 'generic',
    engineer_id: engineer.id,
    admin_user_id: adminUserId || null,
    overall_score: overall,
    dimension_scores: scored.scores,
    reasoning: scored.reasoning,
    highlight_quote: scored.highlight_quote,
  }))

  const { data: inserted, error: insertError } = await serviceClient
    .from('adhoc_matches')
    .insert(rows)
    .select()

  if (insertError) {
    throw new Error(`Failed to insert adhoc matches: ${insertError.message}`)
  }

  return inserted as AdHocMatch[]
}
