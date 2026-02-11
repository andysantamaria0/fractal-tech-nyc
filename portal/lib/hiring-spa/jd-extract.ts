import { load } from 'cheerio'
import type { ExtractedJD } from './types'

const SECTION_HEADINGS = [
  'requirements',
  'qualifications',
  'responsibilities',
  'about the role',
  'about you',
  'what you\'ll do',
  'what we\'re looking for',
  'what you\'ll bring',
  'who you are',
  'nice to have',
  'preferred qualifications',
  'minimum qualifications',
  'benefits',
  'perks',
  'compensation',
  'about us',
  'the team',
  'the role',
  'overview',
  'description',
  'skills',
  'experience',
]

interface ATSConfig {
  platform: string
  contentSelector: string
  titleSelector: string
}

function detectATS(hostname: string): ATSConfig | null {
  if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse')) {
    return {
      platform: 'greenhouse',
      contentSelector: '#content, .job-post, #app_body',
      titleSelector: '.app-title, h1.heading',
    }
  }
  if (hostname.includes('lever.co') || hostname.includes('jobs.lever')) {
    return {
      platform: 'lever',
      contentSelector: '.content, .section-wrapper, .posting-page',
      titleSelector: '.posting-headline h2, h1',
    }
  }
  if (hostname.includes('ashbyhq.com') || hostname.includes('jobs.ashby')) {
    return {
      platform: 'ashby',
      contentSelector: '.ashby-job-posting-brief-description, [data-testid="job-posting"]',
      titleSelector: 'h1',
    }
  }
  if (hostname.includes('workable.com') || hostname.includes('apply.workable')) {
    return {
      platform: 'workable',
      contentSelector: '.job-description, [data-ui="job-description"]',
      titleSelector: 'h1, [data-ui="job-title"]',
    }
  }
  return null
}

function extractSections(text: string): { heading: string; content: string }[] {
  const lines = text.split('\n')
  const sections: { heading: string; content: string }[] = []
  let currentHeading = 'Overview'
  let currentContent: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check if this line looks like a section heading
    const lower = trimmed.toLowerCase().replace(/[^a-z\s']/g, '').trim()
    const isHeading = SECTION_HEADINGS.some(h => lower === h || lower.startsWith(h))

    if (isHeading && currentContent.length > 0) {
      sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
      currentHeading = trimmed
      currentContent = []
    } else if (isHeading && currentContent.length === 0) {
      currentHeading = trimmed
    } else {
      currentContent.push(trimmed)
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
  }

  return sections
}

function addStructuralWhitespace($: ReturnType<typeof load>, container: ReturnType<ReturnType<typeof load>>) {
  for (const el of container.find('h1, h2, h3, h4, h5, h6').toArray()) {
    $(el).prepend('\n\n').append('\n')
  }
  for (const el of container.find('li').toArray()) {
    $(el).prepend('• ')
  }
  for (const el of container.find('p, div, br').toArray()) {
    $(el).append('\n')
  }
}

/**
 * Parse location from a JSON-LD JobPosting `jobLocation` field.
 * Handles: single Place, array of Places, PostalAddress with addressLocality/addressRegion, strings.
 */
export function parseJsonLdLocation(jobLocation: unknown): string | undefined {
  if (!jobLocation) return undefined

  // Handle array of locations — take the first one
  const loc = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation

  if (typeof loc === 'string') return loc.trim() || undefined

  if (typeof loc === 'object' && loc !== null) {
    const place = loc as Record<string, unknown>

    // Check for nested address (PostalAddress)
    const address = place.address
    if (address && typeof address === 'object') {
      const addr = address as Record<string, unknown>
      const city = addr.addressLocality
      const region = addr.addressRegion
      if (typeof city === 'string' && typeof region === 'string') {
        return `${city.trim()}, ${region.trim()}`
      }
      if (typeof city === 'string') return city.trim()
      if (typeof region === 'string') return region.trim()
    }

    // Place with name
    if (typeof place.name === 'string') return place.name.trim() || undefined

    // PostalAddress directly (addressLocality/addressRegion at top level)
    const city = place.addressLocality
    const region = place.addressRegion
    if (typeof city === 'string' && typeof region === 'string') {
      return `${city.trim()}, ${region.trim()}`
    }
    if (typeof city === 'string') return city.trim()
  }

  return undefined
}

/**
 * Try to extract job description from JSON-LD structured data (schema.org/JobPosting).
 * Many ATS platforms (especially Ashby) embed the full JD here even when the body is client-rendered.
 */
function extractFromJsonLd($: ReturnType<typeof load>): { title: string; text: string; location?: string } | null {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).html() || '')
      if (data['@type'] === 'JobPosting' && data.description) {
        const title = data.title || ''
        // description is HTML — parse it to plain text
        const desc$ = load(data.description)
        const text = desc$.root().text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()
        const location = parseJsonLdLocation(data.jobLocation)
        if (text.length > 100) return { title, text, location }
      }
    } catch { /* ignore malformed JSON-LD */ }
  }
  return null
}

function extractContent($: ReturnType<typeof load>, ats: ATSConfig | null): { title: string; text: string; location?: string } {
  // Try JSON-LD first — it's the most reliable source for SPAs like Ashby
  const jsonLd = extractFromJsonLd($)
  if (jsonLd && jsonLd.text) {
    return { title: jsonLd.title || $('title').first().text().trim(), text: jsonLd.text, location: jsonLd.location }
  }

  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, header, footer').remove()
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove()
  $('[class*="nav"], [class*="header"], [class*="footer"], [class*="cookie"], [class*="popup"]').remove()

  let title = ''
  let text = ''

  if (ats) {
    // Use ATS-specific selectors
    title = $(ats.titleSelector).first().text().trim()
    const contentEl = $(ats.contentSelector).first()
    if (contentEl.length > 0) {
      addStructuralWhitespace($, contentEl)
      text = contentEl.text()
    }
  }

  if (!title) {
    title = $('h1').first().text().trim() || $('title').first().text().trim() || 'Untitled Role'
  }

  if (!text) {
    const mainContent = $('main, [role="main"], article, .content, #content').first()
    if (mainContent.length > 0) {
      addStructuralWhitespace($, mainContent)
      text = mainContent.text()
    } else {
      text = $('body').text()
    }
  }

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()

  return { title, text }
}

/**
 * Extract a job description from a URL.
 * Detects ATS platform (Greenhouse, Lever, Ashby, Workable) and uses
 * platform-specific selectors for better extraction.
 */
export async function extractFromUrl(url: string): Promise<ExtractedJD> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'FractalBot/1.0 (hiring-spa-crawler)' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    throw new Error(`Not an HTML page: ${contentType}`)
  }

  const html = await res.text()
  const $ = load(html)

  const hostname = new URL(url).hostname
  const ats = detectATS(hostname)
  const { title, text, location } = extractContent($, ats)

  const sections = extractSections(text)

  return {
    title,
    sections,
    raw_text: text.slice(0, 10000), // cap stored raw text
    source_platform: ats?.platform || 'generic',
    location,
  }
}

/**
 * Extract sections from pasted text.
 * Fallback for when a URL isn't available.
 */
export async function extractFromText(title: string, rawText: string): Promise<ExtractedJD> {
  const sections = extractSections(rawText)

  return {
    title,
    sections,
    raw_text: rawText.slice(0, 10000),
    source_platform: 'pasted',
  }
}
