import { NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractDomainFromLinkedIn } from '@/lib/hiring-spa/domain-extract'
import { runCrawlPipeline } from '@/lib/hiring-spa/pipeline'

export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 1. Fetch the user's profile
    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, company_linkedin, website_url, github_org, has_hiring_spa_access')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2. Require hiring spa access (granted by admin)
    if (!profile.has_hiring_spa_access) {
      return NextResponse.json({ error: 'Hiring spa access not enabled for this account' }, { status: 403 })
    }

    // 3. Check if crawl is already running or complete
    const { data: existingProfile } = await serviceClient
      .from('hiring_profiles')
      .select('status')
      .eq('company_id', user.id)
      .single()

    if (existingProfile && existingProfile.status !== 'draft') {
      return NextResponse.json({
        status: existingProfile.status,
        redirectTo: '/hiring-spa',
      })
    }

    // 4. Determine website URL
    let websiteUrl = profile.website_url
    if (!websiteUrl && profile.company_linkedin) {
      websiteUrl = await extractDomainFromLinkedIn(profile.company_linkedin)
    }

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Could not determine website URL. Please provide it manually.' },
        { status: 400 }
      )
    }

    // 5. Save discovered website URL if not already set
    if (!profile.website_url) {
      await serviceClient
        .from('profiles')
        .update({ website_url: websiteUrl })
        .eq('id', user.id)
    }

    // 6. Upsert hiring_profiles row with status='crawling'
    const { error: upsertError } = await serviceClient
      .from('hiring_profiles')
      .upsert(
        {
          company_id: user.id,
          status: 'crawling',
          crawl_error: null,
        },
        { onConflict: 'company_id' }
      )

    if (upsertError) {
      console.error('Upsert hiring profile error:', upsertError)
      return NextResponse.json({ error: 'Failed to create hiring profile' }, { status: 500 })
    }

    // 7. Run pipeline in background
    after(async () => {
      await runCrawlPipeline(
        user.id,
        websiteUrl!,
        profile.github_org || null,
        profile.company_linkedin || null,
      )
    })

    return NextResponse.json({
      status: 'crawling',
      websiteUrl,
      redirectTo: '/hiring-spa',
    })
  } catch (error) {
    console.error('Onboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
