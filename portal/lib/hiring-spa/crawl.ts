import { load } from 'cheerio'
import type { CrawledPage } from './types'

const MAX_CHARS_PER_PAGE = 5000
const DELAY_MS = 500

/**
 * Crawl a list of URLs, extracting text content from each page.
 * Strips navigation, headers, footers, scripts. Keeps main content.
 * Adds a delay between requests to be respectful.
 */
export async function crawlUrls(urls: string[]): Promise<CrawledPage[]> {
  const results: CrawledPage[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    // Delay between requests (skip first)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }

    try {
      const page = await crawlSinglePage(url)
      if (page.content.trim().length > 0) {
        results.push(page)
      }
    } catch (err) {
      console.warn(`Failed to crawl ${url}:`, err instanceof Error ? err.message : err)
    }
  }

  return results
}

async function crawlSinglePage(url: string): Promise<CrawledPage> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    throw new Error(`Not HTML: ${contentType}`)
  }

  const html = await res.text()
  const $ = load(html)

  // Extract title
  const title = $('title').first().text().trim() || url

  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, header, footer').remove()
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove()
  $('[class*="nav"], [class*="header"], [class*="footer"], [class*="cookie"], [class*="popup"]').remove()

  // Try to get main content area first, fall back to body
  let content = ''
  const mainContent = $('main, [role="main"], article, .content, #content').first()
  if (mainContent.length > 0) {
    content = mainContent.text()
  } else {
    content = $('body').text()
  }

  // Collapse whitespace
  content = content.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim()

  // Truncate to max chars
  if (content.length > MAX_CHARS_PER_PAGE) {
    content = content.slice(0, MAX_CHARS_PER_PAGE) + '...'
  }

  return {
    url,
    title,
    content,
    crawledAt: new Date().toISOString(),
  }
}
