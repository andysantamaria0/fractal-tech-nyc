import { NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runEngineerCrawlPipeline } from '@/lib/hiring-spa/engineer-crawl'
import { notifyDiscordEngineerSignup } from '@/lib/discord'
import { trackServerEvent } from '@/lib/posthog-server'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, linkedin_url, github_url, portfolio_url, resume_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Check if engineer already exists for this auth user
    const { data: existing } = await serviceClient
      .from('engineers')
      .select('id, status, github_url, portfolio_url')
      .eq('auth_user_id', user.id)
      .single()

    if (existing) {
      // Update URLs and trigger crawl if needed
      const needsCrawl = (github_url || portfolio_url) &&
        !existing.github_url && !existing.portfolio_url &&
        existing.status === 'draft'

      // If no URLs to crawl and still in draft, advance to questionnaire
      const advanceToQuestionnaire = !needsCrawl &&
        existing.status === 'draft' &&
        !(github_url || portfolio_url) &&
        !(existing.github_url || existing.portfolio_url)

      await serviceClient
        .from('engineers')
        .update({
          name: name.trim(),
          linkedin_url: linkedin_url || null,
          github_url: github_url || null,
          portfolio_url: portfolio_url || null,
          resume_url: resume_url || null,
          ...(needsCrawl ? { status: 'crawling' } : {}),
          ...(advanceToQuestionnaire ? { status: 'questionnaire' } : {}),
        })
        .eq('id', existing.id)

      if (needsCrawl) {
        after(async () => {
          await runEngineerCrawlPipeline(existing.id, github_url || null, portfolio_url || null)
        })
      }

      return NextResponse.json({ profile: { id: existing.id } })
    }

    // Check if engineer exists by email (link auth_user_id)
    // Use ilike for case-insensitive matching (emails may have been imported with different casing)
    const { data: emailMatch } = await serviceClient
      .from('engineers')
      .select('id, auth_user_id, status, github_url, portfolio_url')
      .ilike('email', user.email!)
      .single()

    if (emailMatch) {
      const needsCrawl = (github_url || portfolio_url) &&
        !emailMatch.github_url && !emailMatch.portfolio_url &&
        emailMatch.status === 'draft'

      // If no URLs to crawl and still in draft, advance to questionnaire
      const advanceToQuestionnaire = !needsCrawl &&
        emailMatch.status === 'draft' &&
        !(github_url || portfolio_url) &&
        !(emailMatch.github_url || emailMatch.portfolio_url)

      const { error: updateError } = await serviceClient
        .from('engineers')
        .update({
          auth_user_id: user.id,
          name: name.trim(),
          linkedin_url: linkedin_url || null,
          github_url: github_url || null,
          portfolio_url: portfolio_url || null,
          resume_url: resume_url || null,
          ...(needsCrawl ? { status: 'crawling' } : {}),
          ...(advanceToQuestionnaire ? { status: 'questionnaire' } : {}),
        })
        .eq('id', emailMatch.id)

      if (updateError) {
        console.error('[engineer/onboard] Email-match update error:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      if (needsCrawl) {
        after(async () => {
          await runEngineerCrawlPipeline(emailMatch.id, github_url || null, portfolio_url || null)
        })
      }

      return NextResponse.json({ profile: { id: emailMatch.id } })
    }

    // Create new engineer record (self-service signup)
    const { data: profile, error: insertError } = await serviceClient
      .from('engineers')
      .insert({
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

    // Track onboard event
    trackServerEvent(user.id, 'engineer_onboarded', {
      name: name.trim(),
      email: user.email,
      has_github: !!github_url,
      has_portfolio: !!portfolio_url,
      has_linkedin: !!linkedin_url,
      has_resume: !!resume_url,
    })

    // Notify Discord of new signup (fire-and-forget)
    notifyDiscordEngineerSignup({
      name: name.trim(),
      email: user.email!,
      githubUrl: github_url,
      linkedinUrl: linkedin_url,
    }).catch(err => console.error('[engineer/onboard] Discord notify error:', err))

    // Trigger crawl if URLs provided
    if (github_url || portfolio_url) {
      await serviceClient
        .from('engineers')
        .update({ status: 'crawling' })
        .eq('id', profile.id)

      after(async () => {
        await runEngineerCrawlPipeline(profile.id, github_url || null, portfolio_url || null)
      })
    } else {
      await serviceClient
        .from('engineers')
        .update({ status: 'questionnaire' })
        .eq('id', profile.id)
    }

    return NextResponse.json({ profile: { id: profile.id } })
  } catch (err) {
    console.error('[engineer/onboard] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
