import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { CohortUpdateEmail } from '@/emails/cohort-update'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Cron endpoint for bi-weekly cohort update emails
// Vercel Cron sends GET requests, so support both GET and POST
export async function GET(request: Request) {
  return handleCohortUpdate(request)
}

export async function POST(request: Request) {
  return handleCohortUpdate(request)
}

async function handleCohortUpdate(request: Request) {
  try {
    // Verify cron secret — fail closed if not configured
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Get active cohort
    const { data: cohort } = await serviceClient
      .from('cohort_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!cohort) {
      return NextResponse.json({ error: 'No active cohort' }, { status: 404 })
    }

    // Calculate current week (accounting for optional break week)
    const startDate = new Date(cohort.start_date)
    const now = new Date()
    const diffMs = now.getTime() - startDate.getTime()
    const calendarWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1

    // Skip sending during break week
    if (cohort.break_week && calendarWeek === cohort.break_week) {
      return NextResponse.json({ message: 'Break week — no email sent' })
    }

    // Adjust week number if past break week
    const currentWeek = cohort.break_week && calendarWeek > cohort.break_week
      ? calendarWeek - 1
      : calendarWeek

    if (currentWeek < 1 || currentWeek > cohort.duration_weeks) {
      return NextResponse.json({ message: 'Cohort not active this week' })
    }

    // Get weekly highlights
    const { data: highlight } = await serviceClient
      .from('weekly_highlights')
      .select('title, description')
      .eq('week_number', currentWeek)
      .eq('cohort_start_date', cohort.start_date)
      .single()

    // Get engineer count
    const { count: engineerCount } = await serviceClient
      .from('engineers')
      .select('*', { count: 'exact', head: true })
      .eq('is_available_for_cycles', true)

    // Get opted-in profiles
    const { data: subscribers } = await serviceClient
      .from('profiles')
      .select('email, name')
      .eq('newsletter_optin', true)

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 })
    }

    const html = CohortUpdateEmail({
      weekNumber: currentWeek,
      totalWeeks: cohort.duration_weeks,
      title: highlight?.title || undefined,
      description: highlight?.description || undefined,
      engineerCount: engineerCount || 0,
    })

    let sent = 0
    let failed = 0

    for (const sub of subscribers) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
          to: sub.email,
          subject: `Fractal Cohort Update — Week ${currentWeek}`,
          html,
        })
        sent++
      } catch (e) {
        console.error(`Failed to send to ${sub.email}:`, e)
        failed++
      }
    }

    return NextResponse.json({ sent, failed, total: subscribers.length })
  } catch (error) {
    console.error('Cohort update email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
