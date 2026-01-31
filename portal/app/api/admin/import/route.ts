import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

interface ImportRowInput {
  email: string
  name: string
  company_linkedin: string
  company_stage: string
}

const MAX_BATCH_SIZE = 100

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const { rows, send_welcome = true, skip_duplicates = true } = body as {
      rows: ImportRowInput[]
      send_welcome?: boolean
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

    const serviceClient = await createServiceClient()

    // Fetch all existing users ONCE before the loop (with pagination)
    const existingEmails = new Set<string>()
    let page = 1
    const perPage = 1000
    while (true) {
      const { data: usersPage } = await serviceClient.auth.admin.listUsers({
        page,
        perPage,
      })
      if (!usersPage?.users || usersPage.users.length === 0) break
      for (const u of usersPage.users) {
        if (u.email) existingEmails.add(u.email.toLowerCase())
      }
      if (usersPage.users.length < perPage) break
      page++
    }

    const details: { email: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[] = []
    let created = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      try {
        // Validate required fields
        if (!row.email || !row.name || !row.company_linkedin || !row.company_stage) {
          failed++
          details.push({ email: row.email || '(missing)', status: 'failed', reason: 'Missing required fields' })
          continue
        }

        // Check if user already exists using the pre-fetched set
        if (existingEmails.has(row.email.toLowerCase())) {
          if (skip_duplicates) {
            skipped++
            details.push({ email: row.email, status: 'skipped', reason: 'User already exists' })
            continue
          } else {
            failed++
            details.push({ email: row.email, status: 'failed', reason: 'User already exists' })
            continue
          }
        }

        // Create auth user via invite
        const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(row.email, {
          data: { name: row.name },
        })

        if (inviteError) {
          failed++
          details.push({ email: row.email, status: 'failed', reason: inviteError.message })
          continue
        }

        // Add to our set to prevent duplicates within the same batch
        existingEmails.add(row.email.toLowerCase())

        // Derive company name from LinkedIn URL
        const derivedCompanyName = row.company_linkedin?.split('/company/')?.[1]?.split('/')?.[0]?.split('?')?.[0]?.replace(/-/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || null

        // Create profile
        const { error: profileError } = await serviceClient
          .from('profiles')
          .insert({
            id: inviteData.user.id,
            name: row.name,
            email: row.email,
            company_linkedin: row.company_linkedin,
            company_stage: row.company_stage,
            company_name: derivedCompanyName,
          })

        if (profileError) {
          failed++
          details.push({ email: row.email, status: 'failed', reason: profileError.message })
          continue
        }

        // HubSpot sync (non-blocking, skip on failure)
        try {
          const { findCompanyByDomain, createCompany, createOrUpdateContact, associateContactToCompany } = await import('@/lib/hubspot')
          const domain = row.email.split('@')[1]

          let companyId: string | undefined
          const existing = await findCompanyByDomain(domain)
          if (existing) {
            companyId = existing.id
          } else {
            const companyName = row.company_linkedin.split('/company/')[1]?.replace(/\//g, '') || domain
            const newCompany = await createCompany({
              name: companyName,
              domain,
              linkedin_company_page: row.company_linkedin,
            })
            companyId = newCompany.id
          }

          const nameParts = row.name.split(' ')
          const contactId = await createOrUpdateContact({
            email: row.email,
            firstname: nameParts[0] || row.name,
            lastname: nameParts.slice(1).join(' ') || '',
          })

          if (companyId && contactId) {
            await associateContactToCompany(contactId, companyId)
          }

          await serviceClient
            .from('profiles')
            .update({ hubspot_contact_id: contactId, hubspot_company_id: companyId })
            .eq('id', inviteData.user.id)
        } catch (e) {
          console.error(`HubSpot sync failed for ${row.email}:`, e)
        }

        // Send welcome email if requested
        if (send_welcome) {
          try {
            const { Resend } = await import('resend')
            const { WelcomeEmail } = await import('@/emails/welcome')
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
              to: row.email,
              subject: 'Welcome to Fractal Partners Portal',
              html: WelcomeEmail({ name: row.name }),
            })
          } catch (e) {
            console.error(`Welcome email failed for ${row.email}:`, e)
          }
        }

        created++
        details.push({ email: row.email, status: 'created' })
      } catch (e) {
        failed++
        details.push({ email: row.email, status: 'failed', reason: String(e) })
      }
    }

    return NextResponse.json({ created, skipped, failed, details })
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
