import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    const html = WelcomeEmail({ name })

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
      to: email,
      subject: 'Welcome to Fractal Partners Portal',
      html,
    })

    if (error) {
      console.error('Welcome email error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Welcome email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
