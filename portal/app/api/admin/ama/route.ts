import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const serviceClient = await createServiceClient()
    const { data: submissions, error: fetchError } = await serviceClient
      .from('ama_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch AMA submissions error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    return NextResponse.json({ submissions: submissions || [] })
  } catch (error) {
    console.error('Admin AMA API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
