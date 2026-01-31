import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

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
