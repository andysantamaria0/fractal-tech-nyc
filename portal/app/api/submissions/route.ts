import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNote } from '@/lib/hubspot'
import { escapeHtml } from '@/lib/sanitize'
import { Resend } from 'resend'
import { FeatureSubmittedEmail } from '@/emails/feature-submitted'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      timeline,
      tech_stack,
      preferred_engineer_id,
      is_hiring,
      hiring_types,
    } = body

    if (!title || !description || !timeline) {
      return NextResponse.json(
        { error: 'Title, description, and timeline are required' },
        { status: 400 }
      )
    }

    // Input length validation
    if (title.length > 200) {
      return NextResponse.json({ error: 'Title must be 200 characters or less' }, { status: 400 })
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: 'Description must be 5000 characters or less' }, { status: 400 })
    }
    if (tech_stack && tech_stack.length > 500) {
      return NextResponse.json({ error: 'Tech stack must be 500 characters or less' }, { status: 400 })
    }

    // Insert feature submission
    const serviceClient = await createServiceClient()
    const { data: submission, error: insertError } = await serviceClient
      .from('feature_submissions')
      .insert({
        user_id: user.id,
        title,
        description,
        timeline,
        tech_stack: tech_stack || null,
        preferred_engineer_id: preferred_engineer_id || null,
        is_hiring: is_hiring || false,
        hiring_types: hiring_types || [],
        hiring_status: is_hiring ? 'interested' : 'no',
        status: 'submitted',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Submission insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      )
    }

    // Create HubSpot note (non-blocking)
    try {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('name, hubspot_contact_id, hubspot_company_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        const noteContent = [
          `<strong>Feature Submission: ${escapeHtml(title)}</strong>`,
          `<br/><br/><strong>Description:</strong> ${escapeHtml(description)}`,
          `<br/><strong>Timeline:</strong> ${escapeHtml(timeline)}`,
          tech_stack ? `<br/><strong>Tech Stack:</strong> ${escapeHtml(tech_stack)}` : '',
          `<br/><strong>Hiring Interest:</strong> ${is_hiring ? `Yes (${(hiring_types || []).map((t: string) => escapeHtml(t)).join(', ')})` : 'No'}`,
          `<br/><strong>Submitted by:</strong> ${escapeHtml(profile.name || '')}`,
        ].filter(Boolean).join('')

        const noteId = await createNote({
          content: noteContent,
          contactId: profile.hubspot_contact_id || undefined,
          companyId: profile.hubspot_company_id || undefined,
        })

        // Store HubSpot note ID
        await serviceClient
          .from('feature_submissions')
          .update({ hubspot_note_id: noteId })
          .eq('id', submission.id)
      }
    } catch (e) {
      console.error('HubSpot note creation failed (non-blocking):', e)
    }

    // Send confirmation email (non-blocking, direct call)
    try {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle()

      if (userProfile?.email && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const html = FeatureSubmittedEmail({
          name: userProfile.name,
          featureTitle: title,
          timeline,
        })
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
          to: userProfile.email,
          subject: `Feature Request Received: ${title}`,
          html,
        })
      }
    } catch (e) {
      console.error('Submission confirmation email failed (non-blocking):', e)
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error('Submission API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
