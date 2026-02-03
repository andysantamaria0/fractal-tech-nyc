import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  HiringRole,
  HiringProfile,
  EngineerProfileSpa,
  DimensionWeights,
  MatchReasoning,
  BeautifiedJD,
} from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna',
]

const MIN_DIMENSION_SCORE = 40
const TOP_N = 3

const SYSTEM_PROMPT = `You are a matching engine for a hiring platform. Given a company's hiring profile, a specific role (with its beautified job description), and an engineer's profile, score how well the engineer matches the role across 5 dimensions.

Each dimension is scored 0-100:
- mission: How well the engineer's goals and motivations align with the company's mission and what they're building
- technical: How well the engineer's technical skills, languages, and frameworks match what the role needs
- culture: How well the engineer's work style, values, and personality fit the company culture
- environment: How well the engineer's preferences for team dynamics, communication, and management match the working environment
- dna: How well the engineer's growth trajectory, ambition level, and career stage match what the company is looking for

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
  "highlight_quote": "A compelling 1-sentence summary of why this engineer is (or isn't) a strong match for this role. Written as if pitching the match to the hiring manager."
}

Guidelines:
- Be calibrated: 80+ means genuinely strong, 50-70 is moderate, below 40 is a poor fit
- Ground scores in specific evidence from both profiles
- Don't inflate scores — honest calibration is more valuable than optimism
- The highlight_quote should be specific and memorable, not generic`

interface ScoreResult {
  scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string
}

/**
 * Score a single engineer against a single role using Claude.
 */
export async function scoreEngineerForRole(
  role: HiringRole,
  hiringProfile: HiringProfile,
  engineer: EngineerProfileSpa,
): Promise<ScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Score this engineer against this role.\n\n'

  // Company DNA
  if (hiringProfile.company_dna) {
    const dna = hiringProfile.company_dna
    userPrompt += '## Company DNA\n\n'
    userPrompt += `Mission: ${dna.mission}\n`
    userPrompt += `Values: ${dna.values.join(', ')}\n`
    userPrompt += `Culture: ${dna.culture}\n`
    userPrompt += `Work Style: ${dna.workStyle}\n`
    if (dna.fundingStage) userPrompt += `Funding Stage: ${dna.fundingStage}\n`
    if (dna.teamSize) userPrompt += `Team Size: ${dna.teamSize}\n`
    userPrompt += `Industry: ${dna.industry}\n\n`
  }

  // Technical Environment
  if (hiringProfile.technical_environment) {
    const te = hiringProfile.technical_environment
    userPrompt += '## Technical Environment\n\n'
    userPrompt += `Languages: ${te.primaryLanguages.join(', ')}\n`
    userPrompt += `Frameworks: ${te.frameworks.join(', ')}\n`
    userPrompt += `Infrastructure: ${te.infrastructure.join(', ')}\n`
    userPrompt += `Dev Practices: ${te.devPractices.join(', ')}\n`
    userPrompt += `Open Source: ${te.openSourceInvolvement}\n\n`
  }

  // Profile Summary
  if (hiringProfile.profile_summary) {
    const ps = hiringProfile.profile_summary
    userPrompt += '## Company Profile Summary\n\n'
    userPrompt += `Snapshot: ${ps.companySnapshot}\n`
    userPrompt += `Culture Signature: ${ps.cultureSignature.join(', ')}\n`
    userPrompt += `Working Environment: ${ps.workingEnvironment}\n`
    userPrompt += `What Great Looks Like: ${ps.whatGreatLooksLike}\n`
    userPrompt += `What Doesn't Work: ${ps.whatDoesntWork}\n\n`
  }

  // Questionnaire answers
  if (hiringProfile.culture_answers) {
    userPrompt += '## Culture Answers\n\n'
    const ca = hiringProfile.culture_answers
    if (ca.successful_employees) userPrompt += `Successful employees: ${ca.successful_employees}\n`
    if (ca.why_employees_stay) userPrompt += `Why employees stay: ${ca.why_employees_stay}\n`
    if (ca.best_people_attributes) userPrompt += `Best people attributes: ${ca.best_people_attributes}\n`
    if (ca.honest_working_style) userPrompt += `Honest working style: ${ca.honest_working_style}\n`
    if (ca.what_doesnt_work) userPrompt += `What doesn't work: ${ca.what_doesnt_work}\n`
    userPrompt += '\n'
  }

  if (hiringProfile.mission_answers) {
    userPrompt += '## Mission Answers\n\n'
    const ma = hiringProfile.mission_answers
    if (ma.actual_mission) userPrompt += `Actual mission: ${ma.actual_mission}\n`
    if (ma.revealing_tradeoffs) userPrompt += `Revealing tradeoffs: ${ma.revealing_tradeoffs}\n`
    userPrompt += '\n'
  }

  if (hiringProfile.team_dynamics_answers) {
    userPrompt += '## Team Dynamics Answers\n\n'
    const td = hiringProfile.team_dynamics_answers
    if (td.daily_communication) userPrompt += `Daily communication: ${td.daily_communication}\n`
    if (td.decision_making_style) userPrompt += `Decision making: ${td.decision_making_style}\n`
    if (td.conflict_handling) userPrompt += `Conflict handling: ${td.conflict_handling}\n`
    userPrompt += '\n'
  }

  // Beautified JD
  if (role.beautified_jd) {
    const jd = role.beautified_jd as BeautifiedJD
    userPrompt += '## Beautified Job Description\n\n'
    userPrompt += `Role Title: ${role.title}\n\n`

    if (jd.requirements.length > 0) {
      userPrompt += 'Requirements:\n'
      for (const req of jd.requirements) {
        const prefix = req.category === 'essential' ? '[Essential]' : '[Nice to have]'
        userPrompt += `- ${prefix} ${req.text}`
        if (req.caveat) userPrompt += ` (${req.caveat})`
        userPrompt += '\n'
      }
      userPrompt += '\n'
    }

    if (jd.team_context) userPrompt += `Team Context: ${jd.team_context}\n`
    if (jd.working_vibe) userPrompt += `Working Vibe: ${jd.working_vibe}\n`
    if (jd.culture_check) userPrompt += `Culture Check: ${jd.culture_check}\n`
    userPrompt += '\n'
  }

  // Dimension weights (for context)
  userPrompt += '## Dimension Weights (company priorities)\n\n'
  const weights = role.dimension_weights
  for (const key of DIMENSION_KEYS) {
    userPrompt += `${key}: ${weights[key]}%\n`
  }
  userPrompt += '\n'

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
 * Compute matches for a role: score all complete engineers, apply thresholds,
 * take top 3, persist to DB.
 */
export async function computeMatchesForRole(
  roleId: string,
  serviceClient: SupabaseClient,
): Promise<{ matches: Array<{ engineer_id: string; overall_score: number; display_rank: number }> }> {
  // Fetch role
  const { data: role, error: roleError } = await serviceClient
    .from('hiring_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (roleError || !role) {
    throw new Error(`Role not found: ${roleId}`)
  }

  const typedRole = role as HiringRole

  // Fetch hiring profile
  const { data: profile, error: profileError } = await serviceClient
    .from('hiring_profiles')
    .select('*')
    .eq('id', typedRole.hiring_profile_id)
    .single()

  if (profileError || !profile) {
    throw new Error(`Hiring profile not found for role: ${roleId}`)
  }

  const typedProfile = profile as HiringProfile

  // Fetch all complete engineer profiles
  const { data: engineers, error: engineerError } = await serviceClient
    .from('engineer_profiles_spa')
    .select('*')
    .eq('status', 'complete')

  if (engineerError) {
    throw new Error(`Failed to fetch engineers: ${engineerError.message}`)
  }

  if (!engineers || engineers.length === 0) {
    // No engineers to match — clear existing and return empty
    await serviceClient
      .from('hiring_spa_matches')
      .delete()
      .eq('role_id', roleId)

    return { matches: [] }
  }

  const typedEngineers = engineers as EngineerProfileSpa[]

  // Score each engineer
  const scored: Array<{
    engineer: EngineerProfileSpa
    scores: DimensionWeights
    reasoning: MatchReasoning
    highlight_quote: string
    overall_score: number
  }> = []

  for (const engineer of typedEngineers) {
    try {
      const result = await scoreEngineerForRole(typedRole, typedProfile, engineer)

      // Check minimum threshold: every dimension must be >= 40
      const belowThreshold = DIMENSION_KEYS.some(
        (key) => result.scores[key] < MIN_DIMENSION_SCORE
      )
      if (belowThreshold) continue

      // Compute weighted overall score
      const weights = typedRole.dimension_weights
      let weightedSum = 0
      let weightTotal = 0
      for (const key of DIMENSION_KEYS) {
        weightedSum += result.scores[key] * weights[key]
        weightTotal += weights[key]
      }
      const overall_score = Math.round(weightedSum / (weightTotal || 1))

      scored.push({
        engineer,
        scores: result.scores,
        reasoning: result.reasoning,
        highlight_quote: result.highlight_quote,
        overall_score,
      })
    } catch (err) {
      console.error(`Failed to score engineer ${engineer.id}:`, err)
      // Continue with other engineers
    }
  }

  // Sort by overall score descending, take top N
  scored.sort((a, b) => b.overall_score - a.overall_score)
  const topMatches = scored.slice(0, TOP_N)

  // Delete existing matches for this role
  await serviceClient
    .from('hiring_spa_matches')
    .delete()
    .eq('role_id', roleId)

  // Insert new matches
  const insertData = topMatches.map((m, i) => ({
    role_id: roleId,
    engineer_id: m.engineer.id,
    overall_score: m.overall_score,
    dimension_scores: m.scores,
    reasoning: m.reasoning,
    highlight_quote: m.highlight_quote,
    display_rank: i + 1,
  }))

  if (insertData.length > 0) {
    const { error: insertError } = await serviceClient
      .from('hiring_spa_matches')
      .insert(insertData)

    if (insertError) {
      throw new Error(`Failed to insert matches: ${insertError.message}`)
    }
  }

  return {
    matches: topMatches.map((m, i) => ({
      engineer_id: m.engineer.id,
      overall_score: m.overall_score,
      display_rank: i + 1,
    })),
  }
}
