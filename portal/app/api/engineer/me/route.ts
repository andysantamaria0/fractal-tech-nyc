import { NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runEngineerCrawlPipeline } from '@/lib/hiring-spa/engineer-crawl'
import { trackServerEvent } from '@/lib/posthog-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('engineers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ profile: profile || null })
  } catch (err) {
    console.error('[engineer/me] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { linkedin_url, github_url, portfolio_url, resume_url } = body

    // Fetch current profile
    const { data: profile } = await supabase
      .from('engineers')
      .select('id, github_url, portfolio_url')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url
    if (github_url !== undefined) updateData.github_url = github_url
    if (portfolio_url !== undefined) updateData.portfolio_url = portfolio_url
    if (resume_url !== undefined) updateData.resume_url = resume_url

    const urlsChanged =
      (github_url !== undefined && github_url !== profile.github_url) ||
      (portfolio_url !== undefined && portfolio_url !== profile.portfolio_url)

    // Use service client for update
    const serviceClient = await createServiceClient()
    const { error: updateError } = await serviceClient
      .from('engineers')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    trackServerEvent(user.id, 'engineer_profile_updated', {
      fields_updated: Object.keys(updateData),
      urls_changed: urlsChanged,
    })

    // Re-trigger crawl if URLs changed
    if (urlsChanged) {
      await serviceClient
        .from('engineers')
        .update({ status: 'crawling', crawl_error: null })
        .eq('id', profile.id)

      after(async () => {
        try {
          await runEngineerCrawlPipeline(
            profile.id,
            github_url ?? profile.github_url,
            portfolio_url ?? profile.portfolio_url,
          )
        } catch (err) {
          console.error('[engineer/me] Crawl error:', err)
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[engineer/me] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
