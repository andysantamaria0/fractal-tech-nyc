import type { GitHubOrgData, GitHubRepoSummary } from './types'

const GITHUB_API = 'https://api.github.com'

/**
 * Analyze a GitHub organization's public presence.
 * Uses the existing GITHUB_TOKEN env var.
 * Returns null if the org doesn't exist or API fails.
 */
export async function analyzeGitHubOrg(orgName: string): Promise<GitHubOrgData | null> {
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
    // Fetch org info
    const orgRes = await fetch(`${GITHUB_API}/orgs/${encodeURIComponent(orgName)}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!orgRes.ok) {
      if (orgRes.status === 404) {
        console.warn(`GitHub org '${orgName}' not found`)
        return null
      }
      throw new Error(`GitHub API returned ${orgRes.status}`)
    }

    const orgInfo = await orgRes.json()

    // Fetch public repos (up to 100, sorted by updated)
    const reposRes = await fetch(
      `${GITHUB_API}/orgs/${encodeURIComponent(orgName)}/repos?sort=updated&per_page=100&type=public`,
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
      .slice(0, 30) // Cap at 30 repos
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
      name: orgInfo.name || orgName,
      description: orgInfo.description,
      publicRepos: orgInfo.public_repos,
      repos: repoSummaries,
      languages,
    }
  } catch (err) {
    console.error(`GitHub analysis failed for '${orgName}':`, err)
    return null
  }
}
