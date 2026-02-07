import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EngineerAvailableEmail } from '@/emails/engineer-available'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Admin-triggered: notify subscribers that an engineer is now available
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { engineer_id } = await request.json()

    if (!engineer_id) {
      return NextResponse.json({ error: 'engineer_id is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Get engineer details
    const { data: engineer } = await serviceClient
      .from('engineers')
      .select('name, focus_areas, what_excites_you')
      .eq('id', engineer_id)
      .maybeSingle()

    if (!engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Get opted-in subscribers
    const { data: subscribers } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('newsletter_optin', true)

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 })
    }

    const html = EngineerAvailableEmail({
      engineerName: engineer.name,
      focusAreas: engineer.focus_areas || [],
      whatExcitesYou: engineer.what_excites_you || undefined,
    })

    let sent = 0
    let failed = 0

    for (const sub of subscribers) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
          to: sub.email,
          subject: `${engineer.name} is now available for cycles`,
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
    console.error('Engineer available email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
