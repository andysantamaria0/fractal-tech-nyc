import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, email, decision } = body as {
      slug: string
      email: string
      decision: 'interested' | 'not_interested'
    }

    if (!slug || !email || !decision) {
      return NextResponse.json({ error: 'slug, email, and decision are required' }, { status: 400 })
    }

    if (!['interested', 'not_interested'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be interested or not_interested' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Look up role by slug
    const { data: role, error: roleError } = await supabase
      .from('hiring_roles')
      .select('id, title, hiring_profile_id')
      .eq('public_slug', slug)
      .maybeSingle()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Look up engineer by email
    const { data: engineer, error: engineerError } = await supabase
      .from('engineers')
      .select('id, name')
      .eq('email', email)
      .maybeSingle()

    if (engineerError || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Find the match
    const { data: match, error: matchError } = await supabase
      .from('hiring_spa_matches')
      .select('id, engineer_notified_at')
      .eq('role_id', role.id)
      .eq('engineer_id', engineer.id)
      .maybeSingle()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Update engineer decision
    const { error: updateError } = await supabase
      .from('hiring_spa_matches')
      .update({
        engineer_decision: decision,
        engineer_decision_at: new Date().toISOString(),
      })
      .eq('id', match.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update decision' }, { status: 500 })
    }

    // If interested, notify Fractal team that both sides are ready
    if (decision === 'interested') {
      const { data: profile } = await supabase
        .from('hiring_profiles')
        .select('company_id')
        .eq('id', role.hiring_profile_id)
        .maybeSingle()

      const { data: companyProfile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', profile?.company_id)
        .maybeSingle()

      const companyName = companyProfile?.company_name || 'Unknown Company'
      const engineerName = engineer.name || 'Unknown Engineer'
      const fractalEmail = process.env.FRACTAL_NOTIFICATION_EMAIL || 'team@fractaltech.nyc'

      resend.emails.send({
        from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
        to: fractalEmail,
        subject: `Both sides ready: ${engineerName} + ${companyName} for ${role.title}`,
        html: `<p><strong>${engineerName}</strong> is interested in connecting with <strong>${companyName}</strong> for the <strong>${role.title}</strong> role. Both sides are ready for an intro.</p>`,
      }).catch((err) => {
        console.error('Failed to send both-sides-ready notification:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Engineer consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
