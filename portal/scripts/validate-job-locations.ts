/**
 * Validate and fix job location data in scanned_jobs.
 *
 * Phase 1 (default, no network): Canonicalize all active job locations using canonicalizeLocation().
 * Phase 2 (--fetch-urls): Fetch each JD URL, extract JSON-LD jobLocation, compare with stored location.
 *
 * Flags:
 *   --dry-run      Preview changes without writing to DB
 *   --fetch-urls   Enable Phase 2 (network fetches)
 *
 * Usage:
 *   npx tsx scripts/validate-job-locations.ts --dry-run
 *   npx tsx scripts/validate-job-locations.ts
 *   npx tsx scripts/validate-job-locations.ts --fetch-urls --dry-run
 *   npx tsx scripts/validate-job-locations.ts --fetch-urls
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { load } from 'cheerio'
import { canonicalizeLocation } from '../lib/job-ingestion'
import { parseJsonLdLocation } from '../lib/hiring-spa/jd-extract'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FETCH_URLS = args.includes('--fetch-urls')

const FETCH_CONCURRENCY = 5
const INTER_BATCH_DELAY_MS = 200
const FETCH_TIMEOUT_MS = 10_000

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface JobRow {
  id: string
  job_url: string
  location: string | null
  company_name: string
  job_title: string
}

/**
 * Fetch JSON-LD jobLocation from a URL.
 */
async function fetchJsonLdLocation(url: string): Promise<string | undefined> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'FractalBot/1.0 (location-validator)' },
  })
  if (!res.ok) return undefined
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return undefined

  const html = await res.text()
  const $ = load(html)

  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).html() || '')
      if (data['@type'] === 'JobPosting' && data.jobLocation) {
        return parseJsonLdLocation(data.jobLocation)
      }
    } catch { /* ignore */ }
  }
  return undefined
}

async function main() {
  console.log(`=== Job Location Validator ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Phase 2 (fetch URLs): ${FETCH_URLS ? 'YES' : 'NO'}`)
  console.log()

  // Fetch all active jobs
  const { data: jobs, error } = await supabase
    .from('scanned_jobs')
    .select('id, job_url, location, company_name, job_title')
    .eq('is_active', true)
    .order('company_name')

  if (error) {
    console.error('Failed to fetch jobs:', error.message)
    process.exit(1)
  }

  const typedJobs = jobs as JobRow[]
  console.log(`Total active jobs: ${typedJobs.length}`)
  console.log()

  // ===== Phase 1: Canonicalize locations =====
  console.log(`--- Phase 1: Canonicalize Locations ---`)
  let canonChanges = 0

  for (const job of typedJobs) {
    const canonical = canonicalizeLocation(job.location)
    if (canonical !== job.location) {
      canonChanges++
      console.log(`  [CANON] ${job.company_name} - ${job.job_title}`)
      console.log(`          "${job.location}" → "${canonical}"`)

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from('scanned_jobs')
          .update({ location: canonical })
          .eq('id', job.id)
        if (updateErr) {
          console.log(`          ERROR: ${updateErr.message}`)
        }
      }
    }
  }

  console.log()
  console.log(`Phase 1 complete: ${canonChanges} locations ${DRY_RUN ? 'would be' : ''} canonicalized`)
  console.log()

  // ===== Phase 2: Fetch URLs and compare JSON-LD locations =====
  if (!FETCH_URLS) {
    console.log('Phase 2 skipped (use --fetch-urls to enable)')
    return
  }

  console.log(`--- Phase 2: JSON-LD Location Validation ---`)
  let jsonLdChanges = 0
  let fetchErrors = 0
  let noJsonLd = 0

  // Process in batches for rate limiting
  for (let i = 0; i < typedJobs.length; i += FETCH_CONCURRENCY) {
    const batch = typedJobs.slice(i, i + FETCH_CONCURRENCY)

    const results = await Promise.allSettled(
      batch.map(async (job) => {
        try {
          const jsonLdLoc = await fetchJsonLdLocation(job.job_url)
          if (!jsonLdLoc) {
            noJsonLd++
            return
          }

          const canonJsonLd = canonicalizeLocation(jsonLdLoc)
          // Refresh: use the (possibly already canonicalized) DB value
          const currentLoc = DRY_RUN ? canonicalizeLocation(job.location) : job.location

          if (canonJsonLd && canonJsonLd !== currentLoc) {
            jsonLdChanges++
            console.log(`  [JSON-LD] ${job.company_name} - ${job.job_title}`)
            console.log(`            DB: "${currentLoc}" → JSON-LD: "${canonJsonLd}"`)

            if (!DRY_RUN) {
              const { error: updateErr } = await supabase
                .from('scanned_jobs')
                .update({ location: canonJsonLd })
                .eq('id', job.id)
              if (updateErr) {
                console.log(`            ERROR: ${updateErr.message}`)
              }
            }
          }
        } catch (err) {
          fetchErrors++
          const msg = err instanceof Error ? err.message : 'Unknown error'
          if (!msg.includes('timeout') && !msg.includes('abort')) {
            console.log(`  [FETCH ERROR] ${job.company_name}: ${msg.slice(0, 80)}`)
          }
        }
      }),
    )

    // Progress
    const done = Math.min(i + FETCH_CONCURRENCY, typedJobs.length)
    process.stdout.write(`\r  Progress: ${done}/${typedJobs.length} jobs fetched`)

    if (i + FETCH_CONCURRENCY < typedJobs.length) {
      await new Promise(resolve => setTimeout(resolve, INTER_BATCH_DELAY_MS))
    }
  }

  console.log()
  console.log()
  console.log(`Phase 2 complete:`)
  console.log(`  ${jsonLdChanges} locations ${DRY_RUN ? 'would be' : ''} updated from JSON-LD`)
  console.log(`  ${noJsonLd} jobs had no JSON-LD location`)
  console.log(`  ${fetchErrors} fetch errors`)
}

main().catch(console.error)
