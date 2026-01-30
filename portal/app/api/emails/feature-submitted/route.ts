import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { FeatureSubmittedEmail } from '@/emails/feature-submitted'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, name, featureTitle, timeline } = await request.json()

    if (!email || !name || !featureTitle || !timeline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const html = FeatureSubmittedEmail({ name, featureTitle, timeline })

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
      to: email,
      subject: `Feature Request Received: ${featureTitle}`,
      html,
    })

    if (error) {
      console.error('Feature submitted email error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Feature submitted email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
