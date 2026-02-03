import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { pickAllowedFields, COMPANY_FIELDS } from '@/lib/api/field-validator'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const { data: company, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, name, email, company_name, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, has_hiring_spa_access, website_url, github_org, created_at')
      .eq('id', id)
      .single()

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({ company })
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const body = await request.json()
    const updates = pickAllowedFields(body, COMPANY_FIELDS)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: company, error: updateError } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, company_name, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, has_hiring_spa_access, website_url, github_org, created_at')
      .single()

    if (updateError) {
      console.error('Update company error:', updateError)
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({ company })
  })
}
