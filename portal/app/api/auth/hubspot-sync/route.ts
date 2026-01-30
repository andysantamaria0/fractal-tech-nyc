import { NextResponse } from 'next/server'
import {
  findCompanyByDomain,
  createCompany,
  createOrUpdateContact,
  associateContactToCompany,
  createNote,
} from '@/lib/hubspot'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { userId, name, email, companyLinkedin, companyStage } =
      await request.json()

    if (!userId || !name || !email || !companyLinkedin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      content: `Created account through partners.fractaltech.nyc portal on ${today}. Company stage: ${companyStage}. LinkedIn: ${companyLinkedin}`,
      contactId,
      companyId,
    })

    // 5. Store HubSpot IDs back in profiles table
    const supabase = await createServiceClient()
    await supabase
      .from('profiles')
      .update({
        hubspot_contact_id: contactId,
        hubspot_company_id: companyId,
      })
      .eq('id', userId)

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
