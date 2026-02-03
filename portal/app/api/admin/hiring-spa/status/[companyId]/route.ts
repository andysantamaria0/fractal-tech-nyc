import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { companyId } = await params

    const { data: profile, error } = await serviceClient
      .from('hiring_profiles')
      .select('id, company_id, status, crawl_error, crawl_completed_at, company_dna, technical_environment, created_at, updated_at')
      .eq('company_id', companyId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ profile: null })
    }

    return NextResponse.json({ profile })
  })
}
