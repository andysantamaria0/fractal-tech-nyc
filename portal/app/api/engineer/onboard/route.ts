import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runEngineerCrawlPipeline } from '@/lib/hiring-spa/engineer-crawl'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { engineer_id, name, linkedin_url, github_url, portfolio_url, resume_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Check if profile already exists for this auth user
    const { data: existing } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ profile: { id: existing.id } })
    }

    // Check if profile exists by email (link it)
    const { data: emailMatch } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id, auth_user_id')
      .eq('email', user.email!)
      .single()

    if (emailMatch) {
      if (!emailMatch.auth_user_id) {
        await serviceClient
          .from('engineer_profiles_spa')
          .update({ auth_user_id: user.id })
          .eq('id', emailMatch.id)
      }
      return NextResponse.json({ profile: { id: emailMatch.id } })
    }

    // Create new engineer_profiles_spa record
    const { data: profile, error: insertError } = await serviceClient
      .from('engineer_profiles_spa')
      .insert({
        engineer_id: engineer_id || null,
        auth_user_id: user.id,
        name: name.trim(),
        email: user.email!,
        linkedin_url: linkedin_url || null,
        github_url: github_url || null,
        portfolio_url: portfolio_url || null,
        resume_url: resume_url || null,
        status: 'draft',
      })
      .select('id, status')
      .single()

    if (insertError) {
      console.error('[engineer/onboard] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Trigger crawl if URLs provided
    if (github_url || portfolio_url) {
      await serviceClient
        .from('engineer_profiles_spa')
        .update({ status: 'crawling' })
        .eq('id', profile.id)

      runEngineerCrawlPipeline(profile.id, github_url || null, portfolio_url || null).catch(
        err => console.error('[engineer/onboard] Crawl error:', err),
      )
    } else {
      await serviceClient
        .from('engineer_profiles_spa')
        .update({ status: 'questionnaire' })
        .eq('id', profile.id)
    }

    return NextResponse.json({ profile: { id: profile.id } })
  } catch (err) {
    console.error('[engineer/onboard] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
