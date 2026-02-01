import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const { invites } = body as { invites: { email: string; name: string }[] }

    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: 'invites array is required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const { email, name } of invites) {
      try {
        if (!email || !name) {
          results.push({ email: email || '(missing)', success: false, error: 'email and name are required' })
          continue
        }

        // Generate invite link without sending Supabase's default email
        const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { data: { name } },
        })

        if (linkError) {
          results.push({ email, success: false, error: linkError.message })
          continue
        }

        const actionLink = linkData.properties.action_link

        // Insert profile with admin flag (company fields left null)
        const { error: profileError } = await serviceClient
          .from('profiles')
          .insert({
            id: linkData.user.id,
            name,
            email,
            is_admin: true,
          })

        if (profileError) {
          console.error(`Profile creation error for ${email}:`, profileError)
          // Auth user was created — continue to send email anyway
        }

        // Send admin invite email via Resend
        try {
          const { Resend } = await import('resend')
          const { AdminInviteEmail } = await import('@/emails/admin-invite')
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
            to: email,
            subject: 'You\'re invited to Fractal Partners Portal (Admin)',
            html: AdminInviteEmail({ name, inviteLink: actionLink }),
          })
        } catch (e) {
          console.error(`Admin invite email failed for ${email}:`, e)
        }

        results.push({ email, success: true })
      } catch (e) {
        console.error(`Invite failed for ${email}:`, e)
        results.push({ email, success: false, error: 'Unexpected error' })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Admin invite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
