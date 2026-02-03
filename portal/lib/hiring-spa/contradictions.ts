import Anthropic from '@anthropic-ai/sdk'
import type { Contradiction, CrawlHighlight } from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are a helpful assistant that detects genuine contradictions between a company's self-reported answers and publicly available information from their website/GitHub.

Your tone is NEVER accusatory. You are gentle, curious, and helpful. You frame contradictions as "We noticed some public information that seems different — want to clarify?"

Rules:
- Only flag GENUINE contradictions, not minor differences or complementary information
- If the answer simply adds detail beyond what was crawled, that is NOT a contradiction
- If the answer is a reasonable interpretation of the crawled data, that is NOT a contradiction
- Focus on factual disagreements, not differences in emphasis
- Return an empty array if no real contradictions exist

You MUST respond with valid JSON: an array of contradiction objects. Each has:
{
  "signal": "The specific public information that seems to conflict",
  "answer_excerpt": "The part of their answer that conflicts",
  "question_id": "The question ID this relates to",
  "suggestion": "A gentle, non-accusatory prompt to help them clarify",
  "source": "Where the public information came from (URL or 'GitHub')"
}

Return [] if no contradictions found.`

/**
 * Detect contradictions between user answers and crawl highlights.
 * Uses Claude to compare answers against relevant public information.
 */
export async function detectContradictions(
  section: string,
  answers: Record<string, string>,
  highlights: CrawlHighlight[]
): Promise<Contradiction[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set, skipping contradiction detection')
    return []
  }

  // Filter to relevant highlights
  const relevantHighlights = highlights.filter(h => h.excerpt.trim().length > 0)

  if (relevantHighlights.length === 0 || Object.keys(answers).length === 0) {
    return []
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = `Compare the following company answers against their publicly available information.\n\n`
  userPrompt += `## Section: ${section}\n\n`
  userPrompt += `## Company's Answers\n\n`

  for (const [questionId, answer] of Object.entries(answers)) {
    if (answer.trim()) {
      userPrompt += `### ${questionId}\n${answer}\n\n`
    }
  }

  userPrompt += `## Public Information (from crawling)\n\n`
  for (const highlight of relevantHighlights) {
    userPrompt += `- [${highlight.topic}] "${highlight.excerpt}" (Source: ${highlight.source})\n`
  }

  userPrompt += `\nIdentify any genuine contradictions. Return a JSON array.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return []
    }

    let jsonStr = textBlock.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as Contradiction[]

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map(c => ({
      signal: c.signal || '',
      answer_excerpt: c.answer_excerpt || '',
      question_id: c.question_id || '',
      suggestion: c.suggestion || '',
      source: c.source || '',
      resolved: false,
    }))
  } catch (err) {
    console.error('Contradiction detection failed:', err)
    return []
  }
}
