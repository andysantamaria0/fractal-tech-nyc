import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
    const { email, name, company_linkedin, company_stage, send_welcome } = body

    if (!email || !name || !company_linkedin || !company_stage) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()

    // Create Supabase Auth user via invite
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { name },
    })

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      )
    }

    // Create profile row
    const { error: profileError } = await serviceClient
      .from('profiles')
      .insert({
        id: inviteData.user.id,
        name,
        email,
        company_linkedin,
        company_stage,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail the request — the auth user was created
    }

    // HubSpot sync (non-blocking)
    try {
      const { findCompanyByDomain, createCompany, createOrUpdateContact, associateContactToCompany } = await import('@/lib/hubspot')

      const domain = email.split('@')[1]
      let companyId: string | undefined
      const existingCompany = await findCompanyByDomain(domain)

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const companyName = company_linkedin.split('/company/')[1]?.replace(/\//g, '') || domain
        const newCompany = await createCompany({
          name: companyName,
          domain,
          linkedin_company_page: company_linkedin,
        })
        companyId = newCompany.id
      }

      const nameParts = name.split(' ')
      const contactId = await createOrUpdateContact({
        email,
        firstname: nameParts[0] || name,
        lastname: nameParts.slice(1).join(' ') || '',
      })

      if (companyId && contactId) {
        await associateContactToCompany(contactId, companyId)
      }

      // Store HubSpot IDs
      await serviceClient
        .from('profiles')
        .update({
          hubspot_contact_id: contactId,
          hubspot_company_id: companyId,
        })
        .eq('id', inviteData.user.id)
    } catch (e) {
      console.error('HubSpot sync failed (non-blocking):', e)
    }

    // Send welcome email via Resend (if requested)
    if (send_welcome) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
          to: email,
          subject: 'Welcome to Fractal Partners Portal',
          html: `
            <h2>Welcome to Fractal Partners, ${name}!</h2>
            <p>You've been invited to the Fractal Partners Portal where you can:</p>
            <ul>
              <li>Browse our current cohort of engineers</li>
              <li>Submit feature requests for your product</li>
              <li>Track cohort progress and highlights</li>
            </ul>
            <p>Check your email for a login link, or visit the portal to get started.</p>
            <p>— The Fractal Team</p>
          `,
        })
      } catch (e) {
        console.error('Welcome email failed (non-blocking):', e)
      }
    }

    return NextResponse.json({ success: true, userId: inviteData.user.id })
  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
