import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ userType: 'new' })
  }

  // Use service client to bypass RLS for cross-table lookups
  const serviceClient = await createServiceClient()

  // Check engineers table (by auth_user_id or email)
  const { data: engineer } = await serviceClient
    .from('engineers')
    .select('id')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .single()

  if (engineer) {
    return NextResponse.json({ userType: 'engineer' })
  }

  // Check profiles table (company users)
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) {
    return NextResponse.json({ userType: 'company' })
  }

  return NextResponse.json({ userType: 'new' })
}
