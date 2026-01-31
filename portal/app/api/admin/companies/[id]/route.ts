import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { data: company, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, name, email, company_name, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, created_at')
      .eq('id', id)
      .single()

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Admin company GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const serviceClient = await createServiceClient()

    const allowedFields = ['name', 'company_name', 'company_linkedin', 'company_stage', 'newsletter_optin']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: company, error: updateError } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, company_name, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, created_at')
      .single()

    if (updateError) {
      console.error('Update company error:', updateError)
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Admin company PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
