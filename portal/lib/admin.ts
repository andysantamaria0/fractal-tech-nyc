import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.is_admin === true
}

export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Unauthorized: admin access required')
  }
}

export async function verifyAdmin(): Promise<{ error?: NextResponse; userId?: string }> {
  if (process.env.NODE_ENV !== 'production') {
    return {}
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { userId: user.id }
}
