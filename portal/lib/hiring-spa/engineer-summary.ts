import Anthropic from '@anthropic-ai/sdk'
import type {
  EngineerDNA,
  WorkPreferencesAnswers,
  CareerGrowthAnswers,
  StrengthsAnswers,
  GrowthAreasAnswers,
  DealBreakersAnswers,
  EngineerProfileSummary,
} from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are an expert at creating compelling engineer profiles for hiring purposes. Given an engineer's technical DNA (from GitHub/portfolio analysis) and their self-reported questionnaire answers, produce a structured profile summary.

The summary should be:
- Honest and specific (not generic fluff)
- Written in third person
- Grounded in the data and answers provided
- Useful for companies evaluating whether this engineer is a good fit

You MUST respond with valid JSON matching this exact structure:
{
  "snapshot": "2-3 sentence overview of who this engineer is",
  "technicalIdentity": "What they build and how — their technical sweet spot, 2-3 sentences",
  "workStyle": "How they like to work, collaborate, and be managed, 2-3 sentences",
  "growthTrajectory": "Where they're headed, what they want to learn/do next, 1-2 sentences",
  "bestFitSignals": ["3-5 short phrases describing ideal company/role fit"],
  "dealBreakers": ["their non-negotiables, 2-4 items"]
}

Guidelines:
- snapshot should feel like a quick elevator pitch about this person
- technicalIdentity should combine GitHub data with self-reported strengths
- bestFitSignals should be specific enough to match against company profiles
- dealBreakers should be honest and direct — these are real red lines
- Avoid generic phrases like "passionate about technology" — be specific`

interface EngineerSummaryInput {
  engineerDna: EngineerDNA | null
  workPreferences: WorkPreferencesAnswers | null
  careerGrowth: CareerGrowthAnswers | null
  strengths: StrengthsAnswers | null
  growthAreas: GrowthAreasAnswers | null
  dealBreakers: DealBreakersAnswers | null
}

/**
 * Generate a structured engineer profile summary from DNA + questionnaire answers.
 */
export async function generateEngineerProfileSummary(
  input: EngineerSummaryInput,
): Promise<EngineerProfileSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Generate an engineer profile summary from the following data.\n\n'

  // Engineer DNA from crawl
  if (input.engineerDna) {
    userPrompt += '## Technical DNA (from GitHub/portfolio analysis)\n\n'
    userPrompt += `Top Skills: ${input.engineerDna.topSkills.join(', ')}\n`
    userPrompt += `Languages: ${input.engineerDna.languages.join(', ')}\n`
    userPrompt += `Frameworks: ${input.engineerDna.frameworks.join(', ')}\n`
    if (input.engineerDna.yearsOfExperience) {
      userPrompt += `Experience: ${input.engineerDna.yearsOfExperience}\n`
    }
    userPrompt += `Seniority Signal: ${input.engineerDna.senioritySignal}\n`
    if (input.engineerDna.projectHighlights.length > 0) {
      userPrompt += `Project Highlights:\n`
      for (const h of input.engineerDna.projectHighlights) {
        userPrompt += `- ${h}\n`
      }
    }
    if (input.engineerDna.publicWriting) {
      userPrompt += `Public Writing: ${input.engineerDna.publicWriting}\n`
    }
    userPrompt += '\n'
  }

  // Work Preferences
  if (input.workPreferences) {
    userPrompt += '## Work Preferences (self-reported)\n\n'
    const wp = input.workPreferences
    if (wp.environment_type) userPrompt += `Environment type: ${wp.environment_type}\n`
    if (wp.remote_preference) userPrompt += `Remote preference: ${wp.remote_preference}\n`
    if (wp.ideal_team_dynamic) userPrompt += `Ideal team dynamic: ${wp.ideal_team_dynamic}\n`
    if (wp.management_style) userPrompt += `Management style: ${wp.management_style}\n`
    userPrompt += '\n'
  }

  // Career & Growth
  if (input.careerGrowth) {
    userPrompt += '## Career & Growth (self-reported)\n\n'
    const cg = input.careerGrowth
    if (cg.whats_next) userPrompt += `What's next: ${cg.whats_next}\n`
    if (cg.growth_areas) userPrompt += `Growth areas: ${cg.growth_areas}\n`
    if (cg.exciting_problems) userPrompt += `Exciting problems: ${cg.exciting_problems}\n`
    userPrompt += '\n'
  }

  // Strengths
  if (input.strengths) {
    userPrompt += '## Strengths (self-reported)\n\n'
    const s = input.strengths
    if (s.genuinely_great_at) userPrompt += `Genuinely great at: ${s.genuinely_great_at}\n`
    if (s.colleagues_come_to_you_for) userPrompt += `Colleagues come for: ${s.colleagues_come_to_you_for}\n`
    userPrompt += '\n'
  }

  // Growth Areas
  if (input.growthAreas) {
    userPrompt += '## Growth Areas (self-reported)\n\n'
    const ga = input.growthAreas
    if (ga.actively_improving) userPrompt += `Actively improving: ${ga.actively_improving}\n`
    if (ga.support_needed) userPrompt += `Support needed: ${ga.support_needed}\n`
    userPrompt += '\n'
  }

  // Deal Breakers
  if (input.dealBreakers) {
    userPrompt += '## Deal Breakers (self-reported)\n\n'
    const db = input.dealBreakers
    if (db.non_negotiables) userPrompt += `Non-negotiables: ${db.non_negotiables}\n`
    if (db.would_make_you_leave) userPrompt += `Would make them leave: ${db.would_make_you_leave}\n`
    userPrompt += '\n'
  }

  userPrompt += 'Produce the JSON profile summary now.'

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

  const parsed = JSON.parse(jsonStr) as EngineerProfileSummary

  if (!parsed.snapshot || !parsed.bestFitSignals) {
    throw new Error('Engineer summary output missing required fields')
  }

  return parsed
}
