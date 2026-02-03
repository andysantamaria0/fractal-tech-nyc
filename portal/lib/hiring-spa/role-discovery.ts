import { load } from 'cheerio'
import { extractFromUrl } from './jd-extract'
import type { CrawledPage } from './types'

export interface DiscoveredRole {
  url: string
  title: string
  raw_text: string
  source_platform: string
  confidence: number
}

const MAX_JOB_PAGES = 15
const DELAY_MS = 300

// Engineering role title signals
const POSITIVE_SIGNALS = [
  'engineer', 'developer', 'sre', 'devops', 'platform', 'infrastructure',
  'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
  'data engineer', 'ml engineer', 'machine learning', 'software',
  'architect', 'tech lead', 'cto', 'vp engineering', 'vp of engineering',
  'head of engineering', 'engineering manager', 'site reliability',
]

const NEGATIVE_SIGNALS = [
  'recruiter', 'sales', 'marketing', 'hr ', 'human resources',
  'operations', 'finance', 'legal', 'customer success', 'customer support',
  'account executive', 'account manager', 'business development',
  'content writer', 'copywriter', 'social media',
]

function classifyRole(title: string): number {
  const lower = title.toLowerCase()

  // Check negative first
  for (const signal of NEGATIVE_SIGNALS) {
    if (lower.includes(signal)) return 0
  }

  // Strong positive
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('software')) {
    return 1.0
  }

  // Moderate positive
  for (const signal of POSITIVE_SIGNALS) {
    if (lower.includes(signal)) return 0.8
  }

  // "Design" without "system design" is likely product design
  if (lower.includes('design') && !lower.includes('system design')) {
    return 0
  }

  // Unknown — include with low confidence
  return 0.5
}

/**
 * ATS board URL patterns to try based on the company's domain slug.
 */
function getATSCandidates(websiteUrl: string): string[] {
  let slug: string
  try {
    const hostname = new URL(websiteUrl).hostname
    // e.g. "www.stripe.com" → "stripe"
    slug = hostname.replace(/^www\./, '').split('.')[0]
  } catch {
    return []
  }

  return [
    `https://boards.greenhouse.io/${slug}`,
    `https://jobs.lever.co/${slug}`,
    `https://jobs.ashbyhq.com/${slug}`,
    `https://${slug}.workable.com`,
  ]
}

/**
 * Find URLs from crawled pages that point to careers/jobs content.
 */
function findCareersUrls(crawledPages: CrawledPage[], websiteUrl: string): string[] {
  const origin = new URL(websiteUrl).origin
  const urls: string[] = []

  for (const page of crawledPages) {
    const lower = page.url.toLowerCase()
    if (lower.includes('/careers') || lower.includes('/jobs') ||
        lower.includes('/open-positions') || lower.includes('/work-with-us') ||
        lower.includes('/join') || lower.includes('/openings')) {
      urls.push(page.url)
    }
  }

  // Also try common careers paths that might not have been in crawled pages
  const commonPaths = ['/careers', '/jobs', '/open-positions']
  for (const path of commonPaths) {
    const candidate = `${origin}${path}`
    if (!urls.includes(candidate)) {
      urls.push(candidate)
    }
  }

  return urls
}

/**
 * Extract individual job listing links from a careers/ATS page.
 */
async function extractJobLinks(pageUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
    })

    if (!res.ok) return []

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return []

    const html = await res.text()
    const $ = load(html)
    const links: string[] = []
    const seen = new Set<string>()

    const hostname = new URL(pageUrl).hostname

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      try {
        const resolved = new URL(href, pageUrl)
        resolved.hash = ''
        const url = resolved.href

        if (seen.has(url)) return
        seen.add(url)

        // Greenhouse job links
        if (resolved.hostname.includes('greenhouse.io') &&
            /\/jobs\/\d+/.test(resolved.pathname)) {
          links.push(url)
          return
        }

        // Lever job links (slug/uuid pattern)
        if (resolved.hostname.includes('lever.co') &&
            /\/[^/]+\/[0-9a-f-]{36}/.test(resolved.pathname)) {
          links.push(url)
          return
        }

        // Ashby job links
        if (resolved.hostname.includes('ashbyhq.com') &&
            resolved.pathname.split('/').length >= 3) {
          links.push(url)
          return
        }

        // Workable job links
        if (resolved.hostname.includes('workable.com') &&
            /\/j\//.test(resolved.pathname)) {
          links.push(url)
          return
        }

        // Same-origin job sub-pages from careers paths
        if (resolved.origin === new URL(pageUrl).origin) {
          const path = resolved.pathname.toLowerCase()
          if ((path.includes('/careers/') || path.includes('/jobs/') ||
               path.includes('/positions/') || path.includes('/openings/')) &&
              // Must have a deeper path segment (individual listing, not just /careers/)
              path.split('/').filter(Boolean).length >= 2 &&
              // Skip asset files
              !/\.(png|jpg|css|js|pdf|svg)$/i.test(path)) {
            links.push(url)
            return
          }
        }

        // ATS links embedded in the page
        if (hostname !== resolved.hostname &&
            (resolved.hostname.includes('greenhouse.io') ||
             resolved.hostname.includes('lever.co') ||
             resolved.hostname.includes('ashbyhq.com') ||
             resolved.hostname.includes('workable.com'))) {
          links.push(url)
        }
      } catch {
        // invalid URL
      }
    })

    return links
  } catch {
    return []
  }
}

/**
 * Discover engineering roles from a company's website.
 *
 * 1. Check ATS board patterns (Greenhouse, Lever, Ashby, Workable)
 * 2. Scan crawled careers/jobs pages for individual job listing links
 * 3. Extract JDs from discovered links
 * 4. Filter to likely engineering roles using title heuristics
 */
export async function discoverRoles(
  websiteUrl: string,
  crawledPages: CrawledPage[]
): Promise<DiscoveredRole[]> {
  const allJobLinks = new Set<string>()

  // 1. Try ATS board patterns
  const atsCandidates = getATSCandidates(websiteUrl)
  const atsChecks = await Promise.all(
    atsCandidates.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
        })
        return res.ok ? url : null
      } catch {
        return null
      }
    })
  )

  const validAtsBoards = atsChecks.filter(Boolean) as string[]

  // 2. Find careers pages from crawled data + common paths
  const careersUrls = findCareersUrls(crawledPages, websiteUrl)

  // 3. Extract job links from all career hubs and ATS boards
  const allHubUrls = [...validAtsBoards, ...careersUrls]
  for (const hubUrl of allHubUrls.slice(0, 5)) {
    const links = await extractJobLinks(hubUrl)
    for (const link of links) {
      allJobLinks.add(link)
    }
  }

  if (allJobLinks.size === 0) {
    console.log('[hiring-spa] No job listing links found')
    return []
  }

  console.log(`[hiring-spa] Found ${allJobLinks.size} job listing links, extracting up to ${MAX_JOB_PAGES}`)

  // 4. Extract JDs from individual job pages
  const roles: DiscoveredRole[] = []
  const jobUrls = Array.from(allJobLinks).slice(0, MAX_JOB_PAGES)

  for (let i = 0; i < jobUrls.length; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }

    try {
      const extracted = await extractFromUrl(jobUrls[i])
      const confidence = classifyRole(extracted.title)

      // Skip clearly non-engineering roles
      if (confidence === 0) continue

      roles.push({
        url: jobUrls[i],
        title: extracted.title,
        raw_text: extracted.raw_text.slice(0, 10000),
        source_platform: extracted.source_platform || 'generic',
        confidence,
      })
    } catch (err) {
      console.warn(`[hiring-spa] Failed to extract JD from ${jobUrls[i]}:`, err instanceof Error ? err.message : err)
    }
  }

  // Sort by confidence descending
  roles.sort((a, b) => b.confidence - a.confidence)

  console.log(`[hiring-spa] Discovered ${roles.length} engineering roles`)
  return roles
}
