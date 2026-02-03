import Anthropic from '@anthropic-ai/sdk'
import type { EngineerCrawlData, EngineerDNA } from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are an expert at analyzing engineers' public presence for hiring purposes. You will be given data from an engineer's GitHub profile and optionally their portfolio/blog pages.

Your job is to synthesize this into a structured engineer profile that helps match them with the right companies and roles.

You MUST respond with valid JSON matching this exact structure:
{
  "topSkills": ["3-6 strongest skills inferred from repos, content, and activity"],
  "languages": ["programming languages used, ordered by prominence"],
  "frameworks": ["frameworks and major libraries used"],
  "yearsOfExperience": "string estimate or null if unclear",
  "senioritySignal": "string - junior/mid/senior/staff inferred from GitHub history + content quality",
  "projectHighlights": ["2-5 notable projects with brief descriptions"],
  "publicWriting": "string summary of blog/writing if found, or null"
}

Guidelines:
- Be specific and factual — only include what you can verify from the content
- For languages/frameworks, use GitHub repo data as primary signal
- senioritySignal should consider: repo complexity, contribution patterns, code quality signals, years of activity
- projectHighlights should focus on the most impressive or distinctive work
- If information is sparse, be honest about uncertainty
- Do NOT invent information that isn't supported by the data`

export interface EngineerSynthesisOutput {
  engineerDna: EngineerDNA
  confidence: number
}

/**
 * Synthesize crawled engineer data into a structured profile using Claude.
 */
export async function synthesizeEngineerData(crawlData: EngineerCrawlData): Promise<EngineerSynthesisOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })

  let userPrompt = 'Analyze the following engineer information and produce a structured profile.\n\n'

  // GitHub data
  if (crawlData.github) {
    userPrompt += '## GitHub Profile\n\n'
    userPrompt += `Username: ${crawlData.github.name}\n`
    if (crawlData.github.description) {
      userPrompt += `Bio: ${crawlData.github.description}\n`
    }
    userPrompt += `Public repos: ${crawlData.github.publicRepos}\n`
    userPrompt += `Languages: ${Object.entries(crawlData.github.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, count]) => `${lang} (${count} repos)`)
      .join(', ')}\n\n`

    if (crawlData.github.repos.length > 0) {
      userPrompt += 'Repositories:\n'
      for (const repo of crawlData.github.repos.slice(0, 20)) {
        userPrompt += `- ${repo.name}: ${repo.description || 'No description'} [${repo.language || 'unknown'}] (${repo.stars} stars, ${repo.forks} forks)`
        if (repo.topics.length > 0) {
          userPrompt += ` topics: ${repo.topics.join(', ')}`
        }
        userPrompt += '\n'
      }
      userPrompt += '\n'
    }
  }

  // Portfolio/blog pages
  if (crawlData.portfolioPages && crawlData.portfolioPages.length > 0) {
    userPrompt += '## Portfolio / Blog Content\n\n'
    for (const page of crawlData.portfolioPages) {
      userPrompt += `### ${page.title} (${page.url})\n${page.content}\n\n`
    }
  }

  // LinkedIn note
  if (crawlData.linkedinUrl) {
    userPrompt += `Note: The engineer has a LinkedIn profile at ${crawlData.linkedinUrl} but it was not crawled (LinkedIn blocks scraping). Factor this into your confidence.\n\n`
  }

  // Confidence guidance
  const hasGithub = !!crawlData.github
  const hasPortfolio = (crawlData.portfolioPages?.length ?? 0) > 0
  if (!hasGithub && !hasPortfolio) {
    userPrompt += 'Note: Very limited data available. Set confidence low and be conservative in your analysis.\n\n'
  }

  userPrompt += 'Produce the JSON analysis now.'

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

  const parsed = JSON.parse(jsonStr) as EngineerDNA

  if (!parsed.topSkills || !parsed.languages) {
    throw new Error('Engineer synthesis output missing required fields')
  }

  // Estimate confidence based on data availability
  let confidence = 0.3
  if (hasGithub) confidence += 0.4
  if (hasPortfolio) confidence += 0.2
  if (crawlData.github && crawlData.github.repos.length > 5) confidence += 0.1

  return {
    engineerDna: parsed,
    confidence: Math.min(confidence, 1.0),
  }
}
