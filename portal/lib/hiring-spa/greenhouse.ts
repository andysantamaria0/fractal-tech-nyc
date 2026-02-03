import type { GreenhouseJob, GreenhouseJobPost } from './types'

const BASE_URL = 'https://harvest.greenhouse.io/v2'

function authHeader(apiKey: string): string {
  return 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
}

async function ghFetch(apiKey: string, path: string): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Greenhouse API ${res.status}: ${res.statusText}`)
  }
  return res
}

/**
 * Parse Link header for pagination.
 * Returns the URL for rel="next" if present.
 */
function parseLinkHeader(header: string | null): string | null {
  if (!header) return null
  const parts = header.split(',')
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (match) return match[1]
  }
  return null
}

/**
 * Fetch all open jobs from Greenhouse, handling pagination.
 */
export async function fetchOpenJobs(apiKey: string): Promise<GreenhouseJob[]> {
  const allJobs: GreenhouseJob[] = []
  let url: string | null = `${BASE_URL}/jobs?status=open&per_page=100`

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader(apiKey),
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Greenhouse API ${res.status}: ${res.statusText}`)
    }
    const jobs: GreenhouseJob[] = await res.json()
    allJobs.push(...jobs)
    url = parseLinkHeader(res.headers.get('link'))
  }

  return allJobs
}

/**
 * Fetch the first active job post for a given job ID.
 * Returns the post content (HTML) or null if no active post exists.
 */
export async function fetchJobPost(apiKey: string, jobId: number): Promise<GreenhouseJobPost | null> {
  const res = await ghFetch(apiKey, `/jobs/${jobId}/job_posts`)
  const posts: GreenhouseJobPost[] = await res.json()
  return posts.find((p) => p.active) ?? null
}

/**
 * Test whether an API key is valid by fetching a single job.
 */
export async function testConnection(apiKey: string): Promise<{ valid: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/jobs?per_page=1`, {
      headers: {
        Authorization: authHeader(apiKey),
        'Content-Type': 'application/json',
      },
    })
    return { valid: res.ok }
  } catch {
    return { valid: false }
  }
}

/**
 * Strip HTML tags and decode common entities to produce plain text.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
