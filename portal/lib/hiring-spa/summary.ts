import Anthropic from '@anthropic-ai/sdk'
import type {
  CompanyDNA,
  TechnicalEnvironment,
  CultureAnswers,
  MissionAnswers,
  TeamDynamicsAnswers,
  Contradiction,
  ProfileSummary,
} from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are an expert at creating compelling company hiring profiles. Given a company's self-reported answers, crawl-derived DNA, and technical environment data, produce a structured hiring profile summary.

The summary should be:
- Honest and specific (not generic marketing copy)
- Written in third person
- Grounded in the answers provided
- Useful for engineers evaluating whether this company is a good fit

You MUST respond with valid JSON matching this exact structure:
{
  "companySnapshot": "2-3 sentences summarizing who this company is and what they do",
  "cultureSignature": ["3-5 defining cultural traits, each a short phrase"],
  "workingEnvironment": "What it's like to work here day-to-day, 2-3 sentences",
  "whatGreatLooksLike": "What the ideal hire looks like at this company, 2-3 sentences",
  "whatDoesntWork": "Who would struggle here and why, 1-2 sentences",
  "technicalSummary": "Tech stack + engineering culture in 2-3 sentences"
}

Guidelines:
- If contradictions were flagged and not resolved, note any remaining tension diplomatically
- cultureSignature should be distinctive, not generic (avoid "collaborative" or "innovative" unless very specific)
- Be direct about working style — engineers want to know the real deal`

interface SummaryInput {
  companyDna: CompanyDNA | null
  technicalEnvironment: TechnicalEnvironment | null
  cultureAnswers: CultureAnswers | null
  missionAnswers: MissionAnswers | null
  teamDynamicsAnswers: TeamDynamicsAnswers | null
  contradictions: Contradiction[] | null
}

/**
 * Generate a structured profile summary from all collected data.
 */
export async function generateProfileSummary(input: SummaryInput): Promise<ProfileSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Generate a hiring profile summary from the following company data.\n\n'

  // Company DNA from crawl
  if (input.companyDna) {
    userPrompt += '## Company DNA (from web crawl)\n\n'
    userPrompt += `Mission: ${input.companyDna.mission}\n`
    userPrompt += `Values: ${input.companyDna.values.join(', ')}\n`
    userPrompt += `Culture: ${input.companyDna.culture}\n`
    userPrompt += `Work Style: ${input.companyDna.workStyle}\n`
    userPrompt += `Industry: ${input.companyDna.industry}\n`
    if (input.companyDna.fundingStage) userPrompt += `Funding: ${input.companyDna.fundingStage}\n`
    if (input.companyDna.teamSize) userPrompt += `Team Size: ${input.companyDna.teamSize}\n`
    userPrompt += '\n'
  }

  // Technical environment
  if (input.technicalEnvironment) {
    userPrompt += '## Technical Environment\n\n'
    userPrompt += `Languages: ${input.technicalEnvironment.primaryLanguages.join(', ')}\n`
    userPrompt += `Frameworks: ${input.technicalEnvironment.frameworks.join(', ')}\n`
    userPrompt += `Infrastructure: ${input.technicalEnvironment.infrastructure.join(', ')}\n`
    userPrompt += `Dev Practices: ${input.technicalEnvironment.devPractices.join(', ')}\n`
    userPrompt += `Open Source: ${input.technicalEnvironment.openSourceInvolvement}\n\n`
  }

  // Culture answers
  if (input.cultureAnswers) {
    userPrompt += '## Culture & DNA (company answers)\n\n'
    const ca = input.cultureAnswers
    if (ca.successful_employees) userPrompt += `Successful employees: ${ca.successful_employees}\n`
    if (ca.why_employees_stay) userPrompt += `Why employees stay: ${ca.why_employees_stay}\n`
    if (ca.best_people_attributes) userPrompt += `Best people attributes: ${ca.best_people_attributes}\n`
    if (ca.honest_working_style) userPrompt += `Working style: ${ca.honest_working_style}\n`
    if (ca.what_doesnt_work) userPrompt += `What doesn't work: ${ca.what_doesnt_work}\n`
    userPrompt += '\n'
  }

  // Mission answers
  if (input.missionAnswers) {
    userPrompt += '## Mission & Values (company answers)\n\n'
    const ma = input.missionAnswers
    if (ma.actual_mission) userPrompt += `Actual mission: ${ma.actual_mission}\n`
    if (ma.revealing_tradeoffs) userPrompt += `Revealing trade-offs: ${ma.revealing_tradeoffs}\n`
    userPrompt += '\n'
  }

  // Team dynamics answers
  if (input.teamDynamicsAnswers) {
    userPrompt += '## Team Dynamics (company answers)\n\n'
    const td = input.teamDynamicsAnswers
    if (td.daily_communication) userPrompt += `Daily communication: ${td.daily_communication}\n`
    if (td.decision_making_style) userPrompt += `Decision making: ${td.decision_making_style}\n`
    if (td.conflict_handling) userPrompt += `Conflict handling: ${td.conflict_handling}\n`
    userPrompt += '\n'
  }

  // Unresolved contradictions
  const unresolved = (input.contradictions || []).filter(c => !c.resolved)
  if (unresolved.length > 0) {
    userPrompt += '## Unresolved Contradictions\n\n'
    for (const c of unresolved) {
      userPrompt += `- Public info: "${c.signal}" vs answer: "${c.answer_excerpt}"\n`
    }
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

  const parsed = JSON.parse(jsonStr) as ProfileSummary

  if (!parsed.companySnapshot || !parsed.cultureSignature) {
    throw new Error('Summary output missing required fields')
  }

  return parsed
}
