import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Called by the engineer login page after sending the magic link.
// Stores the email in engineer_login_intents so the callback knows
// to route this user to /engineer/onboard — even if the magic link
// opens in a different browser and the cookie is missing.
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    await serviceClient
      .from('engineer_login_intents')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
