import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface ImportRowInput {
  email: string
  name: string
  company_linkedin: string
  company_stage: string
}

export async function POST(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { rows } = body as { rows: ImportRowInput[] }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const details: { email: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[] = []
    let created = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
        const exists = existingUsers?.users?.some((u) => u.email === row.email)

        if (exists) {
          skipped++
          details.push({ email: row.email, status: 'skipped', reason: 'User already exists' })
          continue
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

        // Create profile
        const { error: profileError } = await serviceClient
          .from('profiles')
          .insert({
            id: inviteData.user.id,
            name: row.name,
            email: row.email,
            company_linkedin: row.company_linkedin,
            company_stage: row.company_stage,
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
