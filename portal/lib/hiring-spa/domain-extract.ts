/**
 * Extract a company's website domain from their LinkedIn URL.
 *
 * Since we can't scrape LinkedIn, we extract the slug from the URL
 * (e.g. linkedin.com/company/stripe → "stripe") and try common TLDs.
 */

const CANDIDATE_TLDS = ['.com', '.io', '.co', '.dev', '.ai', '.org']

function extractSlug(linkedinUrl: string): string | null {
  try {
    const url = new URL(linkedinUrl)
    const match = url.pathname.match(/\/company\/([^/]+)/)
    if (!match) return null
    return match[1].toLowerCase().trim()
  } catch {
    return null
  }
}

async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
      headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
    })
    return res.ok || (res.status >= 300 && res.status < 400)
  } catch {
    return false
  }
}

export async function extractDomainFromLinkedIn(linkedinUrl: string): Promise<string | null> {
  const slug = extractSlug(linkedinUrl)
  if (!slug) return null

  for (const tld of CANDIDATE_TLDS) {
    const candidate = `https://${slug}${tld}`
    if (await urlResolves(candidate)) {
      return candidate
    }
  }

  return null
}
