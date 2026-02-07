import { NextResponse } from 'next/server'
import {
  findCompanyByDomain,
  createCompany,
  createOrUpdateContact,
  associateContactToCompany,
  createNote,
} from '@/lib/hubspot'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/sanitize'

export async function POST() {
  try {
    // Authenticate request
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read profile data from the database — never trust client-supplied data for identity fields
    const serviceClient = await createServiceClient()
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('name, email, company_linkedin, company_stage')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const name = profile.name
    const email = profile.email
    const companyLinkedin = profile.company_linkedin
    const companyStage = profile.company_stage

    if (!name || !email || !companyLinkedin) {
      return NextResponse.json(
        { error: 'Incomplete profile data' },
        { status: 400 }
      )
    }

    // Parse name
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Extract domain from email
    const emailDomain = email.split('@')[1]

    // 1. Find or create company
    let companyId: string
    const existingCompany = await findCompanyByDomain(emailDomain)

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      // Extract company name from LinkedIn URL or use domain
      const companyName =
        extractCompanyNameFromLinkedin(companyLinkedin) || emailDomain
      const newCompany = await createCompany({
        name: companyName,
        domain: emailDomain,
        linkedin_company_page: companyLinkedin,
      })
      companyId = newCompany.id
    }

    // 2. Create or update contact
    const contactId = await createOrUpdateContact({
      email,
      firstname: firstName,
      lastname: lastName,
    })

    // 3. Associate contact to company
    await associateContactToCompany(contactId, companyId)

    // 4. Create note
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    await createNote({
      content: `Created account through partners.fractaltech.nyc portal on ${today}. Company stage: ${escapeHtml(companyStage || '')}. LinkedIn: ${escapeHtml(companyLinkedin)}`,
      contactId,
      companyId,
    })

    // 5. Store HubSpot IDs back in profiles table
    await serviceClient
      .from('profiles')
      .update({
        hubspot_contact_id: contactId,
        hubspot_company_id: companyId,
      })
      .eq('id', user.id)

    // 6. Send welcome email (server-side, non-blocking)
    try {
      const { Resend } = await import('resend')
      const { WelcomeEmail } = await import('@/emails/welcome')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
        to: email,
        subject: 'Welcome to Fractal Partners Portal',
        html: WelcomeEmail({ name }),
      })
    } catch (e) {
      console.error('Welcome email failed (non-blocking):', e)
    }

    return NextResponse.json({
      success: true,
      contactId,
      companyId,
    })
  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { error: 'HubSpot sync failed' },
      { status: 500 }
    )
  }
}

function extractCompanyNameFromLinkedin(url: string): string | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    // URL format: /company/company-name
    const companyIndex = parts.indexOf('company')
    if (companyIndex !== -1 && parts[companyIndex + 1]) {
      return parts[companyIndex + 1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    }
    return null
  } catch {
    return null
  }
}
