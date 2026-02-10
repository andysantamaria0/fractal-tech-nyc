import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runEngineerCrawlPipeline } from '@/lib/hiring-spa/engineer-crawl'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, github_url, linkedin_url, portfolio_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Check if email already exists
    const { data: existing, error: lookupError } = await serviceClient
      .from('engineers')
      .select('id, status, engineer_dna')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (lookupError) {
      console.error('[engineer-apply] Lookup error:', lookupError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existing) {
      // Resume flow: return existing profile
      // If profile is still draft and has URLs, re-trigger crawl
      if (existing.status === 'draft' && (github_url || portfolio_url)) {
        await serviceClient
          .from('engineers')
          .update({
            name: name.trim(),
            github_url: github_url || null,
            linkedin_url: linkedin_url || null,
            portfolio_url: portfolio_url || null,
            status: 'crawling',
          })
          .eq('id', existing.id)

        // Fire-and-forget crawl
        runEngineerCrawlPipeline(existing.id, github_url || null, portfolio_url || null).catch(
          (err) => console.error('[engineer-apply] Crawl pipeline error:', err),
        )

        return NextResponse.json({
          profile: { id: existing.id, status: 'crawling', engineer_dna: existing.engineer_dna },
        })
      }

      return NextResponse.json({
        profile: { id: existing.id, status: existing.status, engineer_dna: existing.engineer_dna },
      })
    }

    // Create new profile
    const { data: profile, error: insertError } = await serviceClient
      .from('engineers')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        github_url: github_url || null,
        linkedin_url: linkedin_url || null,
        portfolio_url: portfolio_url || null,
        status: 'draft',
      })
      .select('id, status, engineer_dna')
      .maybeSingle()

    if (insertError || !profile) {
      console.error('[engineer-apply] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Trigger crawl if URLs provided
    if (github_url || portfolio_url) {
      await serviceClient
        .from('engineers')
        .update({ status: 'crawling' })
        .eq('id', profile.id)

      runEngineerCrawlPipeline(profile.id, github_url || null, portfolio_url || null).catch(
        (err) => console.error('[engineer-apply] Crawl pipeline error:', err),
      )

      return NextResponse.json({
        profile: { id: profile.id, status: 'crawling', engineer_dna: null },
      })
    }

    // No URLs — skip crawl, go straight to questionnaire
    await serviceClient
      .from('engineers')
      .update({ status: 'questionnaire' })
      .eq('id', profile.id)

    return NextResponse.json({
      profile: { id: profile.id, status: 'questionnaire', engineer_dna: null },
    })
  } catch (err) {
    console.error('[engineer-apply] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Only return id and status — sensitive profile data requires authentication
    const { data: profile, error } = await serviceClient
      .from('engineers')
      .select('id, status')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (error) {
      console.error('[engineer-apply] GET error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ profile: profile || null })
  } catch (err) {
    console.error('[engineer-apply] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
