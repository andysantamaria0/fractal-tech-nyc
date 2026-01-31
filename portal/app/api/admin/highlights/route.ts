import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { data: highlights, error: fetchError } = await serviceClient
      .from('weekly_highlights')
      .select('*')
      .order('week_number', { ascending: false })

    if (fetchError) {
      console.error('Fetch highlights error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 })
    }

    return NextResponse.json({ highlights: highlights || [] })
  } catch (error) {
    console.error('Admin highlights API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const allowedFields = ['week_number', 'cohort_start_date', 'title', 'description']

    const insert: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        insert[field] = body[field]
      }
    }

    if (!insert.week_number || !insert.description || !insert.cohort_start_date) {
      return NextResponse.json(
        { error: 'week_number, cohort_start_date, and description are required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()
    const { data: highlight, error: insertError } = await serviceClient
      .from('weekly_highlights')
      .insert(insert)
      .select()
      .single()

    if (insertError) {
      console.error('Insert highlight error:', insertError)
      return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 })
    }

    return NextResponse.json({ highlight }, { status: 201 })
  } catch (error) {
    console.error('Admin highlights POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
