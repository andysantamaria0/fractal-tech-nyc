import Anthropic from '@anthropic-ai/sdk'
import type { CrawlData, SynthesisOutput } from './types'
import { ALL_QUESTIONS } from './questions'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are helping a company fill out a hiring questionnaire. You have been given a synthesis of their company's website, GitHub, and other public information, along with the raw crawled content.

Your job is to write thoughtful, specific draft answers to each questionnaire question. These drafts will be shown to the company for them to review, edit, and confirm.

Guidelines:
- Write 2-4 sentences per answer, grounded in what was actually found on the website/GitHub
- Use a warm, specific, first-person plural tone ("we", "our team")
- Be concrete — reference real details from the crawled data rather than generic platitudes
- For questions where the crawled data has little or no relevant signal, write a shorter prompt/starting point that acknowledges the gap (e.g., "We'd love to hear your thoughts on this — what does conflict resolution look like on your team?")
- Do NOT invent information that isn't supported by the crawled content
- Do NOT use marketing fluff — be honest and grounded

You MUST respond with valid JSON: an object mapping question IDs to draft answer strings.`

/**
 * Generate draft answers to all questionnaire questions using the synthesis
 * output and raw crawl data for additional context.
 */
export async function generateQuestionnaireDrafts(
  synthesis: SynthesisOutput,
  crawlData: CrawlData,
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  // Build the questions list for the prompt
  const questionsBlock = ALL_QUESTIONS.map(
    (q) => `- ${q.id}: "${q.question}"`
  ).join('\n')

  // Build condensed crawl content (limit size to stay within context)
  let crawlContent = ''
  if (crawlData.website.length > 0) {
    crawlContent += '## Website Content (condensed)\n\n'
    for (const page of crawlData.website.slice(0, 10)) {
      const truncated = page.content.slice(0, 2000)
      crawlContent += `### ${page.title} (${page.url})\n${truncated}\n\n`
    }
  }

  if (crawlData.github) {
    crawlContent += '## GitHub Organization\n\n'
    crawlContent += `Organization: ${crawlData.github.name}\n`
    if (crawlData.github.description) {
      crawlContent += `Description: ${crawlData.github.description}\n`
    }
    crawlContent += `Languages: ${Object.entries(crawlData.github.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, count]) => `${lang} (${count} repos)`)
      .join(', ')}\n\n`
  }

  const userPrompt = `Here is the synthesis of this company's public information:

## Company DNA
- Mission: ${synthesis.companyDna.mission}
- Values: ${synthesis.companyDna.values.join(', ')}
- Culture: ${synthesis.companyDna.culture}
- Work Style: ${synthesis.companyDna.workStyle}
- Industry: ${synthesis.companyDna.industry}
${synthesis.companyDna.fundingStage ? `- Funding Stage: ${synthesis.companyDna.fundingStage}` : ''}
${synthesis.companyDna.teamSize ? `- Team Size: ${synthesis.companyDna.teamSize}` : ''}

## Technical Environment
- Languages: ${synthesis.technicalEnvironment.primaryLanguages.join(', ')}
- Frameworks: ${synthesis.technicalEnvironment.frameworks.join(', ')}
- Infrastructure: ${synthesis.technicalEnvironment.infrastructure.join(', ')}
- Dev Practices: ${synthesis.technicalEnvironment.devPractices.join(', ')}
- Open Source: ${synthesis.technicalEnvironment.openSourceInvolvement}

## Key Highlights
${synthesis.crawlHighlights.map((h) => `- [${h.topic}] "${h.excerpt}" (${h.source})`).join('\n')}

${crawlContent}

## Questionnaire Questions

Write a draft answer for each of these questions:

${questionsBlock}

Respond with a JSON object mapping each question ID to its draft answer string.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON, handling potential markdown code fences
  let jsonStr = textBlock.text.trim()
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr) as Record<string, string>

  // Validate that we got string values for known question IDs
  const validDrafts: Record<string, string> = {}
  for (const q of ALL_QUESTIONS) {
    if (parsed[q.id] && typeof parsed[q.id] === 'string') {
      validDrafts[q.id] = parsed[q.id]
    }
  }

  return validDrafts
}
