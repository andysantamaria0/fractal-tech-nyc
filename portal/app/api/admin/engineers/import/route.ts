import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { pickAllowedFields, ENGINEER_FIELDS } from '@/lib/api/field-validator'

interface EngineerRowInput {
  name: string
  email: string
  github_url: string
  [key: string]: unknown
}

const MAX_BATCH_SIZE = 100

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { rows, skip_duplicates = true } = body as {
      rows: EngineerRowInput[]
      skip_duplicates?: boolean
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    if (rows.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} rows` },
        { status: 400 }
      )
    }

    // Fetch all existing engineer emails in one query for deduplication
    const { data: existingEngineers, error: fetchError } = await serviceClient
      .from('engineers')
      .select('email')

    if (fetchError) {
      console.error('Failed to fetch existing engineers:', fetchError)
      return NextResponse.json({ error: 'Failed to check existing engineers' }, { status: 500 })
    }

    const existingEmails = new Set(
      (existingEngineers || []).map((e: { email: string }) => e.email.toLowerCase())
    )

    const details: { email: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[] = []
    let created = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      try {
        if (!row.name || !row.email || !row.github_url) {
          failed++
          details.push({ email: row.email || '(missing)', status: 'failed', reason: 'Missing required fields (name, email, github_url)' })
          continue
        }

        // Check for duplicates (existing DB + within-batch)
        if (existingEmails.has(row.email.toLowerCase())) {
          if (skip_duplicates) {
            skipped++
            details.push({ email: row.email, status: 'skipped', reason: 'Engineer with this email already exists' })
          } else {
            failed++
            details.push({ email: row.email, status: 'failed', reason: 'Engineer with this email already exists' })
          }
          continue
        }

        // Sanitize fields using the shared allowlist
        const insert = pickAllowedFields(row, ENGINEER_FIELDS)

        const { error: insertError } = await serviceClient
          .from('engineers')
          .insert(insert)

        if (insertError) {
          if (insertError.code === '23505') {
            if (skip_duplicates) {
              skipped++
              details.push({ email: row.email, status: 'skipped', reason: 'Duplicate (constraint)' })
            } else {
              failed++
              details.push({ email: row.email, status: 'failed', reason: 'Duplicate (constraint)' })
            }
          } else {
            failed++
            details.push({ email: row.email, status: 'failed', reason: insertError.message })
          }
          continue
        }

        // Track within-batch duplicates
        existingEmails.add(row.email.toLowerCase())
        created++
        details.push({ email: row.email, status: 'created' })
      } catch (e) {
        failed++
        details.push({ email: row.email || '(unknown)', status: 'failed', reason: String(e) })
      }
    }

    return NextResponse.json({ created, skipped, failed, details })
  })
}
