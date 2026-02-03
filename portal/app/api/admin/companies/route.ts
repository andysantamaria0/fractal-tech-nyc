import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const { data: companies, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, name, email, company_name, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, has_hiring_spa_access, website_url, github_org, created_at')
      .eq('is_admin', false)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch companies error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    return NextResponse.json({ companies: companies || [] })
  })
}
