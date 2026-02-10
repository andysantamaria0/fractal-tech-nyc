import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ redirectTo: '/login' })
  }

  const serviceClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Check engineers table by auth_user_id first, then email
  let engineer: { id: string; auth_user_id: string | null; status: string } | null = null
  const { data: byAuthId } = await serviceClient
    .from('engineers')
    .select('id, auth_user_id, status')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  engineer = byAuthId
  if (!engineer && user.email) {
    const { data: byEmail } = await serviceClient
      .from('engineers')
      .select('id, auth_user_id, status')
      .ilike('email', user.email)
      .limit(1)
      .maybeSingle()
    engineer = byEmail
  }

  // Server-side intent: survives across browsers (unlike cookies)
  let hasLoginIntent = false
  if (user.email) {
    const { data: intent } = await serviceClient
      .from('engineer_login_intents')
      .select('email')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    hasLoginIntent = !!intent
  }

  // Check engineer flow cookie
  const cookieStore = await cookies()
  const isEngineerFlow = cookieStore.get('x-engineer-flow')?.value === '1'

  if (engineer) {
    // Link auth_user_id if not already set
    if (!engineer.auth_user_id) {
      await serviceClient
        .from('engineers')
        .update({ auth_user_id: user.id })
        .eq('id', engineer.id)
    }
    const redirectTo = (engineer.auth_user_id && engineer.status !== 'draft')
      ? '/engineer/dashboard'
      : '/engineer/onboard'
    return NextResponse.json({ redirectTo })
  }

  if (hasLoginIntent || isEngineerFlow) {
    // Create a draft engineer record (best-effort)
    if (user.email) {
      await serviceClient
        .from('engineers')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          name: user.email.split('@')[0],
          status: 'draft',
        })
    }
    // Clean up the login intent
    if (hasLoginIntent && user.email) {
      await serviceClient
        .from('engineer_login_intents')
        .delete()
        .eq('email', user.email.toLowerCase())
    }
    return NextResponse.json({ redirectTo: '/engineer/onboard' })
  }

  // No engineer signals — check company profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ redirectTo: profile ? '/dashboard' : '/complete-profile' })
}
