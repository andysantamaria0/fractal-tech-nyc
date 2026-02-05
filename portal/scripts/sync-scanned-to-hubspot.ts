/**
 * Syncs companies from scanned_jobs to HubSpot.
 * Creates companies if they don't exist and adds a note "Added by Job Detective Jr."
 *
 * Usage: npx tsx scripts/sync-scanned-to-hubspot.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import {
  findCompanyByDomain,
  createCompany,
  createNote,
} from '../lib/hubspot'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY!
const HUBSPOT_PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars.')
  process.exit(1)
}

if (!HUBSPOT_API_KEY) {
  console.error('Missing HUBSPOT_API_KEY env var.')
  process.exit(1)
}

if (!HUBSPOT_PORTAL_ID) {
  console.error('Missing NEXT_PUBLIC_HUBSPOT_PORTAL_ID env var.')
  process.exit(1)
}

interface ScannedJobRow {
  id: string
  company_name: string
  company_domain: string | null
  hubspot_link: string | null
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Query jobs without hubspot_link that have a company_domain
  const { data: jobs, error } = await supabase
    .from('scanned_jobs')
    .select('id, company_name, company_domain, hubspot_link')
    .is('hubspot_link', null)
    .not('company_domain', 'is', null)

  if (error) {
    console.error('Failed to fetch scanned_jobs:', error.message)
    process.exit(1)
  }

  if (!jobs || jobs.length === 0) {
    console.log('No scanned jobs without HubSpot links found.')
    return
  }

  console.log(`Found ${jobs.length} jobs without HubSpot links`)

  // Group jobs by company_domain
  const jobsByDomain = new Map<string, ScannedJobRow[]>()
  for (const job of jobs as ScannedJobRow[]) {
    if (!job.company_domain) continue
    const domain = job.company_domain.toLowerCase()
    if (!jobsByDomain.has(domain)) {
      jobsByDomain.set(domain, [])
    }
    jobsByDomain.get(domain)!.push(job)
  }

  console.log(`Grouped into ${jobsByDomain.size} unique company domains`)
  console.log()

  let created = 0
  let existing = 0
  let failed = 0

  for (const [domain, domainJobs] of Array.from(jobsByDomain.entries())) {
    const companyName = domainJobs[0].company_name
    const jobIds = domainJobs.map((j) => j.id)

    process.stdout.write(`[${domain}] ${companyName}... `)

    try {
      // Check if company already exists in HubSpot
      let companyId: string
      let isNew = false

      const existingCompany = await findCompanyByDomain(domain)

      if (existingCompany) {
        companyId = existingCompany.id
        existing++
        process.stdout.write('EXISTS ')
      } else {
        // Create new company
        const newCompany = await createCompany({
          name: companyName,
          domain: domain,
        })
        companyId = newCompany.id
        isNew = true
        created++
        process.stdout.write('CREATED ')
      }

      // Create a note if company was newly created
      if (isNew) {
        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        await createNote({
          content: `Added by Job Detective Jr. on ${today}`,
          companyId,
        })
        process.stdout.write('+ NOTE ')
      }

      // Build HubSpot link
      const hubspotLink = `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/company/${companyId}`

      // Update all scanned_jobs for this domain with the HubSpot link
      const { error: updateError } = await supabase
        .from('scanned_jobs')
        .update({ hubspot_link: hubspotLink })
        .in('id', jobIds)

      if (updateError) {
        console.log(`DB UPDATE FAILED: ${updateError.message}`)
        failed++
        continue
      }

      console.log(`-> Updated ${jobIds.length} job(s)`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`FAILED: ${message.slice(0, 100)}`)
      failed++
    }
  }

  console.log()
  console.log('=== Summary ===')
  console.log(`Companies created: ${created}`)
  console.log(`Companies already existed: ${existing}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total processed: ${jobsByDomain.size}`)
}

main().catch(console.error)
