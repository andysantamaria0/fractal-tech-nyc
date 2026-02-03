import Anthropic from '@anthropic-ai/sdk'
import type {
  ExtractedJD,
  BeautifiedJD,
  ProfileSummary,
  CompanyDNA,
  TechnicalEnvironment,
  JDFeedback,
} from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are an expert at rewriting job descriptions to be honest, compelling, and useful for engineers.

You will be given:
1. An extracted job description (title, sections, raw text)
2. The company's profile summary, DNA, and technical environment

Your job is to produce a "beautified" job description that cuts corporate fluff and gives candidates the real picture.

You MUST respond with valid JSON matching this exact structure:
{
  "requirements": [
    {
      "text": "string - the requirement",
      "category": "essential" | "nice_to_have",
      "caveat": "optional string - e.g. 'we'd teach the right person' or 'only matters at senior level'"
    }
  ],
  "team_context": "string - what team they'd join, what the team works on, who they'd work with. 2-3 sentences.",
  "working_vibe": "string - day-to-day feel, pace, level of autonomy, meeting culture, how work gets done. 2-3 sentences.",
  "culture_check": "string - honest 'you'll thrive here if...' and 'you won't enjoy this if...' in 2-3 sentences."
}

Guidelines:
- Write in second person ("you'll", "your")
- Be honest about which requirements are actually essential vs nice-to-have
- Add caveats where appropriate (e.g. "3+ years experience" might get caveat "we care more about what you've built than years on a resume")
- Use the company's actual culture data to write the culture_check — don't make it generic
- If the JD says something that contradicts the company profile, go with the company profile (they know themselves better)
- Keep requirements to 8-12 items max — merge redundant ones
- team_context should feel specific, not corporate
- working_vibe should give a real sense of the day-to-day
- culture_check should be genuinely useful for self-selection`

interface BeautifyInput {
  extractedJD: ExtractedJD
  profileSummary: ProfileSummary | null
  companyDna: CompanyDNA | null
  technicalEnvironment: TechnicalEnvironment | null
  feedback?: JDFeedback | null
  previousBeautifiedJD?: BeautifiedJD | null
}

function formatFeedbackForPrompt(feedback: JDFeedback, previousJD: BeautifiedJD): string {
  const lines: string[] = ['## User Feedback on Previous JD\n']

  // Requirement feedback
  for (let i = 0; i < previousJD.requirements.length; i++) {
    const req = previousJD.requirements[i]
    const fb = feedback.requirements[i]
    if (!fb || (fb.status === null && !fb.note)) continue

    if (fb.status === 'confirmed') {
      lines.push(`KEEP: "${req.text}" — user confirmed this requirement`)
    } else if (fb.status === 'rejected') {
      lines.push(`REMOVE OR REWORK: "${req.text}" — user rejected this requirement`)
    }
    if (fb.note) {
      lines.push(`  Note: ${fb.note}`)
    }
  }

  // Prose section feedback
  const proseSections = [
    { key: 'team_context' as const, label: 'Team Context' },
    { key: 'working_vibe' as const, label: 'Working Vibe / Day to Day' },
    { key: 'culture_check' as const, label: 'Culture Check' },
  ]

  for (const { key, label } of proseSections) {
    const fb = feedback[key]
    if (!fb || (fb.sentiment === null && !fb.note)) continue

    if (fb.sentiment === 'positive') {
      lines.push(`\n${label}: User liked this section`)
    } else if (fb.sentiment === 'negative') {
      lines.push(`\n${label}: User wants this section reworked`)
    }
    if (fb.note) {
      lines.push(`  Note: ${fb.note}`)
    }
  }

  return lines.join('\n')
}

/**
 * Beautify a job description using Claude, incorporating company profile context.
 */
export async function beautifyJD(input: BeautifyInput): Promise<BeautifiedJD> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Beautify the following job description using the company context provided.\n\n'

  // Job description
  userPrompt += '## Job Description\n\n'
  userPrompt += `Title: ${input.extractedJD.title}\n\n`

  if (input.extractedJD.sections.length > 0) {
    for (const section of input.extractedJD.sections) {
      userPrompt += `### ${section.heading}\n${section.content}\n\n`
    }
  } else {
    userPrompt += input.extractedJD.raw_text + '\n\n'
  }

  // Company context
  if (input.profileSummary) {
    userPrompt += '## Company Profile Summary\n\n'
    userPrompt += `Snapshot: ${input.profileSummary.companySnapshot}\n`
    userPrompt += `Culture signature: ${input.profileSummary.cultureSignature.join(', ')}\n`
    userPrompt += `Working environment: ${input.profileSummary.workingEnvironment}\n`
    userPrompt += `What great looks like: ${input.profileSummary.whatGreatLooksLike}\n`
    userPrompt += `What doesn't work: ${input.profileSummary.whatDoesntWork}\n`
    userPrompt += `Technical summary: ${input.profileSummary.technicalSummary}\n\n`
  }

  if (input.companyDna) {
    userPrompt += '## Company DNA\n\n'
    userPrompt += `Mission: ${input.companyDna.mission}\n`
    userPrompt += `Values: ${input.companyDna.values.join(', ')}\n`
    userPrompt += `Culture: ${input.companyDna.culture}\n`
    userPrompt += `Work style: ${input.companyDna.workStyle}\n`
    userPrompt += `Industry: ${input.companyDna.industry}\n\n`
  }

  if (input.technicalEnvironment) {
    userPrompt += '## Technical Environment\n\n'
    userPrompt += `Languages: ${input.technicalEnvironment.primaryLanguages.join(', ')}\n`
    userPrompt += `Frameworks: ${input.technicalEnvironment.frameworks.join(', ')}\n`
    userPrompt += `Infrastructure: ${input.technicalEnvironment.infrastructure.join(', ')}\n`
    userPrompt += `Dev practices: ${input.technicalEnvironment.devPractices.join(', ')}\n\n`
  }

  // Append feedback if re-beautifying
  if (input.feedback && input.previousBeautifiedJD) {
    userPrompt += formatFeedbackForPrompt(input.feedback, input.previousBeautifiedJD)
    userPrompt += '\n\nIncorporate the user feedback above. Keep confirmed items, remove or rework rejected items, and address any notes. '
  }

  userPrompt += 'Produce the beautified JD JSON now.'

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

  const parsed = JSON.parse(jsonStr) as BeautifiedJD

  if (!parsed.requirements || !parsed.team_context || !parsed.working_vibe || !parsed.culture_check) {
    throw new Error('Beautified JD output missing required fields')
  }

  return parsed
}
