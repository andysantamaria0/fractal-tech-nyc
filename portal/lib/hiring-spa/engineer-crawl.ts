import { createServiceClient } from '@/lib/supabase/server'
import { crawlUrls } from './crawl'
import { synthesizeEngineerData } from './engineer-synthesis'
import { generateEngineerProfileSummary } from './engineer-summary'
import { computeMatchesForEngineer } from './job-matching'
import type { EngineerCrawlData, GitHubOrgData, GitHubRepoSummary } from './types'

const GITHUB_API = 'https://api.github.com'

/**
 * Run the full crawl pipeline for an engineer profile.
 * Designed to run in the background via Next.js after().
 *
 * Flow: GitHub user analysis → portfolio crawl → LLM synthesis → save results
 */
export async function runEngineerCrawlPipeline(
  engineerProfileId: string,
  githubUrl: string | null,
  portfolioUrl: string | null,
): Promise<void> {
  const serviceClient = await createServiceClient()

  try {
    const crawlData: EngineerCrawlData = {}

    // 1. Analyze GitHub user (if provided)
    if (githubUrl) {
      const username = extractGitHubUsername(githubUrl)
      if (username) {
        console.log(`[engineer-crawl] Analyzing GitHub user: ${username}`)
        const githubData = await analyzeGitHubUser(username)
        if (githubData) {
          crawlData.github = githubData
          console.log(`[engineer-crawl] GitHub analysis complete: ${githubData.publicRepos} repos`)
        } else {
          console.log(`[engineer-crawl] GitHub analysis returned no data`)
        }
      }
    }

    // 2. Crawl portfolio/blog (if provided)
    if (portfolioUrl) {
      console.log(`[engineer-crawl] Crawling portfolio: ${portfolioUrl}`)
      const pages = await crawlUrls([portfolioUrl])
      if (pages.length > 0) {
        crawlData.portfolioPages = pages
        console.log(`[engineer-crawl] Crawled ${pages.length} portfolio pages`)
      }
    }

    // 3. Synthesize with LLM
    console.log(`[engineer-crawl] Starting LLM synthesis`)
    const { engineerDna, confidence } = await synthesizeEngineerData(crawlData)
    console.log(`[engineer-crawl] Synthesis complete (confidence: ${confidence})`)

    // 4. Check if questionnaire was already completed while we were crawling
    const { data: currentProfile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('questionnaire_completed_at, priority_ratings, work_preferences, career_growth, strengths, growth_areas, deal_breakers')
      .eq('id', engineerProfileId)
      .single()

    const questionnaireAlreadyDone = !!currentProfile?.questionnaire_completed_at

    // 5. Save results — advance to 'complete' if questionnaire is already done
    const { error: saveError } = await serviceClient
      .from('engineer_profiles_spa')
      .update({
        crawl_data: crawlData,
        crawl_error: null,
        crawl_completed_at: new Date().toISOString(),
        engineer_dna: engineerDna,
        status: questionnaireAlreadyDone ? 'complete' : 'questionnaire',
      })
      .eq('id', engineerProfileId)

    if (saveError) {
      throw new Error(`Failed to save results: ${saveError.message}`)
    }

    console.log(`[engineer-crawl] Pipeline complete for engineer profile ${engineerProfileId}`)

    // 6. If questionnaire was done while crawling, generate summary and trigger matches
    if (questionnaireAlreadyDone && currentProfile) {
      console.log(`[engineer-crawl] Questionnaire already completed — generating summary and computing matches`)
      try {
        const summary = await generateEngineerProfileSummary({
          engineerDna,
          workPreferences: currentProfile.work_preferences,
          careerGrowth: currentProfile.career_growth,
          strengths: currentProfile.strengths,
          growthAreas: currentProfile.growth_areas,
          dealBreakers: currentProfile.deal_breakers,
        })
        await serviceClient
          .from('engineer_profiles_spa')
          .update({ profile_summary: summary })
          .eq('id', engineerProfileId)
      } catch (summaryErr) {
        console.error('[engineer-crawl] Summary generation failed:', summaryErr)
      }

      computeMatchesForEngineer(engineerProfileId, serviceClient).catch(
        err => console.error('[engineer-crawl] Match computation error:', err),
      )
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown pipeline error'
    console.error(`[engineer-crawl] Pipeline failed for ${engineerProfileId}:`, errorMessage)

    // Save error state
    await serviceClient
      .from('engineer_profiles_spa')
      .update({
        status: 'draft',
        crawl_error: errorMessage,
      })
      .eq('id', engineerProfileId)
  }
}

/**
 * Extract GitHub username from a URL like https://github.com/username
 */
function extractGitHubUsername(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'github.com') return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    return parts[0] || null
  } catch {
    // Treat as plain username if not a URL
    return url.trim() || null
  }
}

/**
 * Analyze a GitHub user's public presence.
 * Adapted from analyzeGitHubOrg for individual user accounts.
 * Returns data in the same GitHubOrgData shape for type reuse.
 */
async function analyzeGitHubUser(username: string): Promise<GitHubOrgData | null> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.warn('GITHUB_TOKEN not set, skipping GitHub analysis')
    return null
  }

  const headers: Record<string, string> = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'FractalBot/1.0',
  }

  try {
    // Fetch user info
    const userRes = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!userRes.ok) {
      if (userRes.status === 404) {
        console.warn(`GitHub user '${username}' not found`)
        return null
      }
      throw new Error(`GitHub API returned ${userRes.status}`)
    }

    const userInfo = await userRes.json()

    // Fetch public repos (up to 100, sorted by updated)
    const reposRes = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=owner`,
      { headers, signal: AbortSignal.timeout(10000) }
    )

    if (!reposRes.ok) {
      throw new Error(`GitHub repos API returned ${reposRes.status}`)
    }

    const repos: Array<{
      name: string
      description: string | null
      language: string | null
      stargazers_count: number
      forks_count: number
      updated_at: string
      topics: string[]
      fork: boolean
    }> = await reposRes.json()

    // Filter out forks, map to summary
    const repoSummaries: GitHubRepoSummary[] = repos
      .filter((r) => !r.fork)
      .slice(0, 30)
      .map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        updatedAt: r.updated_at,
        topics: r.topics || [],
      }))

    // Aggregate languages
    const languages: Record<string, number> = {}
    for (const repo of repoSummaries) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1
      }
    }

    return {
      name: userInfo.name || userInfo.login || username,
      description: userInfo.bio,
      publicRepos: userInfo.public_repos,
      repos: repoSummaries,
      languages,
    }
  } catch (err) {
    console.error(`GitHub analysis failed for user '${username}':`, err)
    return null
  }
}
