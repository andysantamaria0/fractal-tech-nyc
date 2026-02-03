import Anthropic from '@anthropic-ai/sdk'
import type { CrawlData, SynthesisOutput } from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are an expert at analyzing companies for technical hiring purposes. You will be given crawled content from a company's website and optionally their GitHub organization data.

Your job is to synthesize this into a structured company profile that helps match them with the right engineers.

You MUST respond with valid JSON matching this exact structure:
{
  "companyDna": {
    "mission": "string - the company's core mission in 1-2 sentences",
    "values": ["array of core values"],
    "culture": "string - description of company culture",
    "workStyle": "string - remote/hybrid/in-office, work-life balance signals",
    "fundingStage": "string or null - if detectable",
    "teamSize": "string or null - if detectable",
    "industry": "string - primary industry/vertical"
  },
  "technicalEnvironment": {
    "primaryLanguages": ["programming languages used"],
    "frameworks": ["frameworks and major libraries"],
    "infrastructure": ["cloud, deployment, infrastructure tools"],
    "devPractices": ["notable dev practices - CI/CD, testing, code review, etc."],
    "openSourceInvolvement": "string - level of open source activity"
  },
  "crawlHighlights": [
    {
      "excerpt": "string - key quote or finding from the crawled content",
      "source": "string - URL where this was found",
      "topic": "mission|culture|values|tech|team|hiring|product"
    }
  ],
  "confidence": 0.0 to 1.0
}

Guidelines:
- Extract 10-20 crawl highlights covering diverse topics
- Be specific and factual — only include what you can verify from the content
- If information is not available, use reasonable defaults or null
- The confidence score should reflect how much useful information was available
- For technical environment, combine website mentions with GitHub data if available
- Do NOT invent information that isn't supported by the crawled content`

/**
 * Synthesize crawled data into a structured company profile using Claude.
 */
export async function synthesizeCrawlData(crawlData: CrawlData): Promise<SynthesisOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  // Build the user prompt with all crawled content
  let userPrompt = 'Analyze the following company information and produce a structured hiring profile.\n\n'

  // Website content
  if (crawlData.website.length > 0) {
    userPrompt += '## Website Content\n\n'
    for (const page of crawlData.website) {
      userPrompt += `### ${page.title} (${page.url})\n${page.content}\n\n`
    }
  }

  // GitHub data
  if (crawlData.github) {
    userPrompt += '## GitHub Organization\n\n'
    userPrompt += `Organization: ${crawlData.github.name}\n`
    if (crawlData.github.description) {
      userPrompt += `Description: ${crawlData.github.description}\n`
    }
    userPrompt += `Public repos: ${crawlData.github.publicRepos}\n`
    userPrompt += `Languages: ${Object.entries(crawlData.github.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, count]) => `${lang} (${count} repos)`)
      .join(', ')}\n\n`

    if (crawlData.github.repos.length > 0) {
      userPrompt += 'Notable repositories:\n'
      for (const repo of crawlData.github.repos.slice(0, 15)) {
        userPrompt += `- ${repo.name}: ${repo.description || 'No description'} [${repo.language || 'unknown'}] (${repo.stars} stars)\n`
      }
      userPrompt += '\n'
    }
  }

  // LinkedIn note
  if (crawlData.linkedinUrl) {
    userPrompt += `Note: The company has a LinkedIn page at ${crawlData.linkedinUrl} but it was not crawled (LinkedIn blocks scraping). Factor this into your confidence score.\n\n`
  }

  userPrompt += 'Produce the JSON analysis now.'

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

  const parsed = JSON.parse(jsonStr) as SynthesisOutput

  // Basic validation
  if (!parsed.companyDna || !parsed.technicalEnvironment) {
    throw new Error('Synthesis output missing required fields')
  }

  return parsed
}
