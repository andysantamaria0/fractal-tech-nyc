/**
 * Script to add pipeline updates from weekly check-ins to HubSpot.
 * Creates companies if they don't exist and adds notes about candidate interactions.
 *
 * Usage: npx tsx scripts/add-pipeline-updates.ts
 */

// Load env first before any other imports
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as hubspot from '@hubspot/api-client'
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/companies/models/Filter'
import { AssociationSpecAssociationCategoryEnum as NoteAssocCategory } from '@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec'

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY!
const HUBSPOT_PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID!

if (!HUBSPOT_API_KEY) {
  console.error('Missing HUBSPOT_API_KEY env var.')
  process.exit(1)
}

if (!HUBSPOT_PORTAL_ID) {
  console.error('Missing NEXT_PUBLIC_HUBSPOT_PORTAL_ID env var.')
  process.exit(1)
}

// Create client after env is loaded
const hubspotClient = new hubspot.Client({
  accessToken: HUBSPOT_API_KEY,
})

// Pipeline updates from Feb 3, 2026
const pipelineUpdates = [
  {
    person: 'Russell',
    company: 'Tech Force',
    domain: null,
    stage: 'Online assessment pending',
  },
  {
    person: 'Russell',
    company: 'Suno',
    domain: 'suno.com',
    stage: 'Wants to apply - Software Engineer Role',
  },
  {
    person: 'Peter',
    company: 'Studentbox AI',
    domain: null,
    stage: 'Met founder at career event. Product is AI agent for college students. Potential payment on MVP.',
  },
  {
    person: 'Valerie',
    company: 'Cohere',
    domain: 'cohere.com',
    stage: 'Demo almost complete, need help making a MS account',
  },
  {
    person: 'Valerie',
    company: 'Bayou Energy',
    domain: null,
    stage: 'Interview booked for Wednesday',
  },
  {
    person: 'Valerie',
    company: 'IAPS',
    domain: null,
    stage: 'Fellowship applied',
  },
  {
    person: 'Valerie',
    company: 'SPAR',
    domain: null,
    stage: 'Should be hearing back this week',
  },
  {
    person: 'Scout',
    company: 'Metaculus',
    domain: 'metaculus.com',
    stage: 'Had screener, tech interview, long-form interview. Next steps: work test + CEO chats. Scout not sure if interested anymore.',
  },
  {
    person: 'Scout',
    company: 'Dust',
    domain: 'dust.tt',
    stage: 'Ongoing, going well. Wishes had more time to do dev work for them.',
  },
  {
    person: 'Scout',
    company: 'Superbuilders',
    domain: null,
    stage: 'Meeting with Patrick Skinner',
  },
  {
    person: 'Scout',
    company: 'Henry Labs',
    domain: null,
    stage: 'Will meet with Lawrence on Wed',
  },
  {
    person: 'Scout',
    company: 'RetailPath',
    domain: null,
    stage: 'Meeting with Conner Guy on Wed',
  },
  {
    person: 'Mauria',
    company: 'Pangram',
    domain: null,
    stage: 'REJECTED - Founder replied saying not hiring any more engineers right now',
  },
  {
    person: 'Mauria',
    company: 'Varick Agents',
    domain: null,
    stage: 'Still waiting to hear back',
  },
  {
    person: 'Evan',
    company: 'VOCN',
    domain: 'vocn.org',
    stage: 'Following up on contract work as platform steward. Had initial call with CEO (went well). Another call with technical team lead on Friday. CEO non-technical, role vaguely scoped.',
  },
  {
    person: 'Nyan',
    company: 'Solid',
    domain: null,
    stage: 'Two calls, hopefully will receive info about take-home soon. Had an interview that went well.',
  },
  {
    person: 'Ethan',
    company: 'Affirm',
    domain: 'affirm.com',
    stage: 'Applied - Early Career SWE - no response yet',
  },
  {
    person: 'Ethan',
    company: 'Loop',
    domain: null,
    stage: 'Applied - Full Stack SWE - no response yet',
  },
  {
    person: 'Ethan',
    company: 'Pace',
    domain: null,
    stage: 'Applied - Design Engineer - no response yet',
  },
  {
    person: 'Ethan',
    company: 'DuoLingo',
    domain: 'duolingo.com',
    stage: 'Applied - QA Specialist - no response yet',
  },
]

async function findCompanyByDomain(domain: string) {
  const response = await hubspotClient.crm.companies.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'domain',
            operator: FilterOperatorEnum.Eq,
            value: domain,
          },
        ],
      },
    ],
    sorts: [],
    properties: ['name', 'domain'],
    limit: 1,
    after: '0',
  })
  return response.results?.[0] ?? null
}

async function findCompanyByName(name: string) {
  const response = await hubspotClient.crm.companies.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'name',
            operator: FilterOperatorEnum.ContainsToken,
            value: name,
          },
        ],
      },
    ],
    sorts: [],
    properties: ['name', 'domain'],
    limit: 1,
    after: '0',
  })
  return response.results?.[0] ?? null
}

async function createCompany(name: string, domain?: string) {
  const response = await hubspotClient.crm.companies.basicApi.create({
    properties: { name, domain: domain || '' },
    associations: [],
  })
  return response
}

async function createNote(content: string, companyId: string) {
  const response = await hubspotClient.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: content,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [
      {
        to: { id: companyId },
        types: [
          {
            associationCategory: NoteAssocCategory.HubspotDefined,
            associationTypeId: 190,
          },
        ],
      },
    ],
  })
  return response.id
}

async function findOrCreateCompany(name: string, domain: string | null): Promise<{ id: string; isNew: boolean } | null> {
  try {
    // Try to find by domain first if we have one
    if (domain) {
      const byDomain = await findCompanyByDomain(domain)
      if (byDomain) {
        return { id: byDomain.id, isNew: false }
      }
    }

    // Try to find by name
    const byName = await findCompanyByName(name)
    if (byName) {
      return { id: byName.id, isNew: false }
    }

    // Create new company
    const newCompany = await createCompany(name, domain || undefined)
    return { id: newCompany.id, isNew: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error finding/creating company ${name}:`, message)
    return null
  }
}

async function main() {
  console.log('Adding pipeline updates to HubSpot...')
  console.log(`Total updates: ${pipelineUpdates.length}`)
  console.log()

  let companiesCreated = 0
  let companiesExisting = 0
  let notesAdded = 0
  let failed = 0

  // Group updates by company to avoid duplicate company lookups
  const byCompany = new Map<string, typeof pipelineUpdates>()
  for (const update of pipelineUpdates) {
    const key = update.company.toLowerCase()
    if (!byCompany.has(key)) {
      byCompany.set(key, [])
    }
    byCompany.get(key)!.push(update)
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  for (const [, updates] of Array.from(byCompany.entries())) {
    const firstUpdate = updates[0]
    process.stdout.write(`[${firstUpdate.company}] `)

    try {
      // Find or create the company
      const result = await findOrCreateCompany(firstUpdate.company, firstUpdate.domain)

      if (!result) {
        console.log('FAILED to find/create company')
        failed += updates.length
        continue
      }

      if (result.isNew) {
        companiesCreated++
        process.stdout.write('CREATED ')
      } else {
        companiesExisting++
        process.stdout.write('EXISTS ')
      }

      // Build note content with all people interacting with this company
      const noteLines = [`Pipeline Update - ${today}`, '']
      for (const update of updates) {
        noteLines.push(`${update.person}: ${update.stage}`)
      }
      noteLines.push('')
      noteLines.push('Source: Weekly check-in (Feb 3, 2026)')

      // Create the note
      await createNote(noteLines.join('\n'), result.id)
      notesAdded++

      const hubspotLink = `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/company/${result.id}`
      console.log(`+ NOTE (${updates.length} interaction(s)) -> ${hubspotLink}`)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`FAILED: ${message.slice(0, 100)}`)
      failed += updates.length
    }
  }

  console.log()
  console.log('=== Summary ===')
  console.log(`Companies created: ${companiesCreated}`)
  console.log(`Companies already existed: ${companiesExisting}`)
  console.log(`Notes added: ${notesAdded}`)
  console.log(`Failed: ${failed}`)
}

main().catch(console.error)
