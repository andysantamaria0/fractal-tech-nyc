import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { data: companies, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, name, email, company_linkedin, company_stage, newsletter_optin, hubspot_contact_id, hubspot_company_id, created_at')
      .eq('is_admin', false)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch companies error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    return NextResponse.json({ companies: companies || [] })
  } catch (error) {
    console.error('Admin companies API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
