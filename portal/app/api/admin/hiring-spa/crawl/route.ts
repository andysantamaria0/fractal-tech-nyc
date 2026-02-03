import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { runCrawlPipeline } from '@/lib/hiring-spa/pipeline'

export const maxDuration = 60

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Verify company exists and has hiring spa access
    const { data: company, error: companyError } = await serviceClient
      .from('profiles')
      .select('id, website_url, github_org, company_linkedin, has_hiring_spa_access')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (!company.has_hiring_spa_access) {
      return NextResponse.json({ error: 'Company does not have hiring spa access' }, { status: 403 })
    }

    if (!company.website_url) {
      return NextResponse.json({ error: 'Company website URL is required' }, { status: 400 })
    }

    // Upsert hiring_profiles row with status='crawling'
    const { error: upsertError } = await serviceClient
      .from('hiring_profiles')
      .upsert(
        {
          company_id: companyId,
          status: 'crawling',
          crawl_error: null,
        },
        { onConflict: 'company_id' }
      )

    if (upsertError) {
      console.error('Upsert hiring profile error:', upsertError)
      return NextResponse.json({ error: 'Failed to create hiring profile' }, { status: 500 })
    }

    // Run pipeline in background after response is sent
    after(async () => {
      await runCrawlPipeline(
        companyId,
        company.website_url,
        company.github_org || null,
        company.company_linkedin || null,
      )
    })

    return NextResponse.json({ status: 'crawling' })
  })
}
