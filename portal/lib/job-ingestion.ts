import type { SupabaseClient } from '@supabase/supabase-js'

export interface JobIngestionInput {
  company_name: string
  company_domain: string
  job_title: string
  job_url: string
  job_board_source?: string
  location?: string
  date_posted?: string
  description?: string
}

export interface IngestionResult {
  job_url: string
  status: 'created' | 'updated' | 'duplicate' | 'error'
  id?: string
  error?: string
}

/**
 * Normalize company domain (lowercase, remove www.)
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .trim()
}

/**
 * Normalize job title for deduplication fingerprinting.
 * Removes level indicators, normalizes whitespace.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/\s*(sr\.?|senior|jr\.?|junior|lead|staff|principal|intern)\s*/gi, ' ')
    .replace(/\s*(i|ii|iii|iv|v|1|2|3|4|5)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize location for comparison.
 */
export function normalizeLocation(location: string | null | undefined): string {
  if (!location) return ''
  return location
    .toLowerCase()
    .replace(/,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate a fingerprint for deduplication.
 * Jobs with same fingerprint are considered duplicates.
 */
export function generateJobFingerprint(job: JobIngestionInput): string {
  const domain = normalizeDomain(job.company_domain)
  const title = normalizeTitle(job.job_title)
  const location = normalizeLocation(job.location)
  return `${domain}::${title}::${location}`
}

/**
 * Validate job input data.
 */
export function validateJobInput(job: JobIngestionInput): string | null {
  if (!job.company_name?.trim()) return 'company_name is required'
  if (!job.company_domain?.trim()) return 'company_domain is required'
  if (!job.job_title?.trim()) return 'job_title is required'
  if (!job.job_url?.trim()) return 'job_url is required'

  try {
    new URL(job.job_url)
  } catch {
    return 'job_url must be a valid URL'
  }

  return null
}

/**
 * Ingest a single job with deduplication.
 * Returns the result with status indicating what happened.
 */
export async function ingestJob(
  job: JobIngestionInput,
  serviceClient: SupabaseClient,
): Promise<IngestionResult> {
  // Validate
  const validationError = validateJobInput(job)
  if (validationError) {
    return { job_url: job.job_url || 'unknown', status: 'error', error: validationError }
  }

  const normalizedDomain = normalizeDomain(job.company_domain)
  const fingerprint = generateJobFingerprint(job)
  const now = new Date().toISOString()

  try {
    // Check for existing job by URL first (exact match)
    const { data: existingByUrl } = await serviceClient
      .from('scanned_jobs')
      .select('id, fingerprint')
      .eq('job_url', job.job_url)
      .maybeSingle()

    if (existingByUrl) {
      // Update last_seen_at and potentially description if newer is better
      const updateData: Record<string, unknown> = {
        last_seen_at: now,
        is_active: true,
      }

      // Update description if we have a longer/better one
      if (job.description && job.description.length > 100) {
        updateData.description = job.description
      }

      await serviceClient
        .from('scanned_jobs')
        .update(updateData)
        .eq('id', existingByUrl.id)

      return { job_url: job.job_url, status: 'updated', id: existingByUrl.id }
    }

    // Check for duplicate by fingerprint (same company + title + location, different URL)
    const { data: existingByFingerprint } = await serviceClient
      .from('scanned_jobs')
      .select('id, job_url, description')
      .eq('fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle()

    if (existingByFingerprint) {
      // Duplicate found - update last_seen if this source has better data
      const updateData: Record<string, unknown> = {
        last_seen_at: now,
      }

      // If new description is longer, use it
      const existingDescLen = existingByFingerprint.description?.length || 0
      const newDescLen = job.description?.length || 0
      if (newDescLen > existingDescLen + 100) {
        updateData.description = job.description
        updateData.job_url = job.job_url // switch to better source
        updateData.job_board_source = job.job_board_source
      }

      await serviceClient
        .from('scanned_jobs')
        .update(updateData)
        .eq('id', existingByFingerprint.id)

      return {
        job_url: job.job_url,
        status: 'duplicate',
        id: existingByFingerprint.id,
      }
    }

    // New job - insert
    const { data: inserted, error: insertError } = await serviceClient
      .from('scanned_jobs')
      .insert({
        company_name: job.company_name.trim(),
        company_domain: normalizedDomain,
        job_title: job.job_title.trim(),
        job_url: job.job_url,
        job_board_source: job.job_board_source || null,
        location: job.location?.trim() || null,
        date_posted: job.date_posted || null,
        description: job.description || null,
        fingerprint,
        is_active: true,
        first_seen_at: now,
        last_seen_at: now,
      })
      .select('id')
      .single()

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        return { job_url: job.job_url, status: 'duplicate' }
      }
      throw insertError
    }

    return { job_url: job.job_url, status: 'created', id: inserted.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { job_url: job.job_url, status: 'error', error: message }
  }
}

/**
 * Ingest multiple jobs in batch.
 */
export async function ingestJobs(
  jobs: JobIngestionInput[],
  serviceClient: SupabaseClient,
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = []

  for (const job of jobs) {
    const result = await ingestJob(job, serviceClient)
    results.push(result)
  }

  return results
}

/**
 * Mark jobs as inactive if they haven't been seen recently.
 * Call this periodically to clean up stale listings.
 */
export async function deactivateStaleJobs(
  serviceClient: SupabaseClient,
  staleDays: number = 14,
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - staleDays)

  const { data, error } = await serviceClient
    .from('scanned_jobs')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('last_seen_at', cutoff.toISOString())
    .select('id')

  if (error) {
    throw new Error(`Failed to deactivate stale jobs: ${error.message}`)
  }

  return data?.length || 0
}
