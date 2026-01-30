import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const serviceClient = await createServiceClient()
    const { data: history, error } = await serviceClient
      .from('submission_history')
      .select(`
        *,
        profiles!submission_history_changed_by_fkey (name)
      `)
      .eq('submission_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch history error:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({ history: history || [] })
  } catch (error) {
    console.error('Admin history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
