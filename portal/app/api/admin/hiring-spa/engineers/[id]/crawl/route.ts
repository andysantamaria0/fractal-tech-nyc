import { NextResponse, after } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { runEngineerCrawlPipeline } from '@/lib/hiring-spa/engineer-crawl'

export const maxDuration = 60

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    // Fetch the engineer profile
    const { data: profile, error: fetchError } = await serviceClient
      .from('engineers')
      .select('id, github_url, portfolio_url, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Engineer profile not found' }, { status: 404 })
    }

    if (!profile.github_url && !profile.portfolio_url) {
      return NextResponse.json(
        { error: 'Engineer profile needs at least a GitHub URL or portfolio URL to crawl' },
        { status: 400 },
      )
    }

    // Set status to crawling
    const { error: updateError } = await serviceClient
      .from('engineers')
      .update({ status: 'crawling', crawl_error: null })
      .eq('id', id)

    if (updateError) {
      console.error('Update engineer profile status error:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Run pipeline in background after response is sent
    after(async () => {
      await runEngineerCrawlPipeline(
        profile.id,
        profile.github_url || null,
        profile.portfolio_url || null,
      )
    })

    return NextResponse.json({ status: 'crawling' })
  })
}
