import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchOpenJobs, fetchJobPost, stripHtml } from './greenhouse'

interface SyncParams {
  companyId: string
  apiKey: string
  serviceClient: SupabaseClient
}

interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Pull open jobs from Greenhouse and upsert them as draft hiring roles.
 */
export async function syncGreenhouseRoles({
  companyId,
  apiKey,
  serviceClient,
}: SyncParams): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  // 1. Look up the company's hiring profile
  const { data: profile, error: profileError } = await serviceClient
    .from('hiring_profiles')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (profileError || !profile) {
    throw new Error('Company has no hiring profile — run a crawl first')
  }

  // 2. Fetch existing ATS roles for dedup
  const { data: existingRoles } = await serviceClient
    .from('hiring_roles')
    .select('id, ats_external_id, status')
    .eq('hiring_profile_id', profile.id)
    .eq('ats_provider', 'greenhouse')
    .not('ats_external_id', 'is', null)

  const existingByExternalId = new Map(
    (existingRoles ?? []).map((r: { id: string; ats_external_id: string; status: string }) => [
      r.ats_external_id,
      r,
    ])
  )

  // 3. Fetch open jobs from Greenhouse
  const jobs = await fetchOpenJobs(apiKey)

  // 4. Process each job
  for (const job of jobs) {
    try {
      // Build disambiguated title
      const parts: string[] = []
      if (job.departments?.length) {
        parts.push(job.departments.map((d) => d.name).join(', '))
      }
      if (job.offices?.length) {
        parts.push(job.offices.map((o) => o.name).join(', '))
      }
      const title = parts.length > 0 ? `${job.name} (${parts.join(' - ')})` : job.name

      // Fetch JD content
      let sourceContent: string | null = null
      try {
        const post = await fetchJobPost(apiKey, job.id)
        if (post?.content) {
          sourceContent = stripHtml(post.content)
          // Cap at 10KB
          if (sourceContent.length > 10_000) {
            sourceContent = sourceContent.slice(0, 10_000)
          }
        }
      } catch {
        // Non-fatal — we can still create the role without JD content
      }

      const externalId = String(job.id)
      const existing = existingByExternalId.get(externalId)

      if (existing) {
        if (existing.status === 'draft') {
          // Update draft roles with latest data
          const { error: updateError } = await serviceClient
            .from('hiring_roles')
            .update({
              title,
              source_content: sourceContent,
              ats_synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (updateError) {
            result.errors.push(`Update failed for job ${job.id}: ${updateError.message}`)
          } else {
            result.updated++
          }
        } else {
          // Active/beautified — only bump sync timestamp
          const { error: bumpError } = await serviceClient
            .from('hiring_roles')
            .update({ ats_synced_at: new Date().toISOString() })
            .eq('id', existing.id)

          if (bumpError) {
            result.errors.push(`Sync timestamp update failed for job ${job.id}: ${bumpError.message}`)
          }
          result.skipped++
        }
      } else {
        // Insert new role as draft
        const { error: insertError } = await serviceClient.from('hiring_roles').insert({
          hiring_profile_id: profile.id,
          title,
          source_content: sourceContent,
          status: 'draft',
          ats_provider: 'greenhouse',
          ats_external_id: externalId,
          ats_synced_at: new Date().toISOString(),
        })

        if (insertError) {
          result.errors.push(`Insert failed for job ${job.id}: ${insertError.message}`)
        } else {
          result.created++
        }
      }
    } catch (err) {
      result.errors.push(
        `Error processing job ${job.id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // 5. Update ats_connections with sync metadata
  const totalProcessed = result.created + result.updated + result.skipped
  await serviceClient
    .from('ats_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_role_count: totalProcessed,
      last_sync_error: result.errors.length > 0 ? result.errors.join('; ') : null,
    })
    .eq('company_id', companyId)
    .eq('provider', 'greenhouse')

  return result
}
