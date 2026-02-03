import robotsParser from 'robots-parser'

const MAX_URLS = 20

const PRIORITY_PATHS = [
  '/about', '/team', '/culture', '/careers', '/values', '/mission',
  '/company', '/our-team', '/our-story', '/who-we-are', '/join',
  '/jobs', '/work-with-us', '/engineering', '/tech', '/blog',
]

/**
 * Discover URLs to crawl starting from a website URL.
 * Fetches robots.txt, then the homepage, then extracts links.
 * Prioritizes pages likely to contain company/culture info.
 */
export async function discoverUrls(websiteUrl: string): Promise<{
  urls: string[]
  robotsTxt: string | null
}> {
  const base = new URL(websiteUrl)
  const origin = base.origin

  // 1. Fetch and parse robots.txt
  let robotsTxt: string | null = null
  let robots: ReturnType<typeof robotsParser> | null = null
  try {
    const robotsRes = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    })
    if (robotsRes.ok) {
      robotsTxt = await robotsRes.text()
      robots = robotsParser(`${origin}/robots.txt`, robotsTxt)
    }
  } catch {
    // robots.txt not available — proceed without it
  }

  // 2. Fetch homepage
  let homepageHtml: string
  try {
    const res = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
    })
    if (!res.ok) {
      throw new Error(`Homepage returned ${res.status}`)
    }
    homepageHtml = await res.text()
  } catch (err) {
    throw new Error(`Failed to fetch homepage: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // 3. Extract links from homepage
  const linkRegex = /href=["']([^"']+)["']/gi
  const foundUrls = new Set<string>()
  foundUrls.add(websiteUrl) // always include homepage

  let match
  while ((match = linkRegex.exec(homepageHtml)) !== null) {
    try {
      const href = match[1]
      // Skip fragments, mailto, tel, javascript
      if (href.startsWith('#') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('javascript:')) {
        continue
      }

      const resolved = new URL(href, origin)
      // Only same-origin links
      if (resolved.origin !== origin) continue
      // Skip asset files
      if (/\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|ico|pdf|zip|mp4|webm)$/i.test(resolved.pathname)) {
        continue
      }

      // Strip hash and normalize
      resolved.hash = ''
      foundUrls.add(resolved.href)
    } catch {
      // Invalid URL — skip
    }
  }

  // 4. Filter by robots.txt
  const allowedUrls = Array.from(foundUrls).filter((url) => {
    if (!robots) return true
    return robots.isAllowed(url, 'FractalBot') !== false
  })

  // 5. Prioritize URLs
  const prioritized = allowedUrls.sort((a, b) => {
    const aPath = new URL(a).pathname.toLowerCase()
    const bPath = new URL(b).pathname.toLowerCase()
    const aPriority = PRIORITY_PATHS.findIndex((p) => aPath.includes(p))
    const bPriority = PRIORITY_PATHS.findIndex((p) => bPath.includes(p))
    // Priority pages first (found in list = lower index = higher priority)
    if (aPriority !== -1 && bPriority === -1) return -1
    if (aPriority === -1 && bPriority !== -1) return 1
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
    return 0
  })

  return {
    urls: prioritized.slice(0, MAX_URLS),
    robotsTxt,
  }
}
