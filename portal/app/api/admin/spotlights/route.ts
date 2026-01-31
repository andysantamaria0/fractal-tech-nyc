import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { data: spotlights, error: fetchError } = await serviceClient
      .from('spotlight_content')
      .select('*')
      .order('display_order', { ascending: true })

    if (fetchError) {
      console.error('Fetch spotlights error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch spotlights' }, { status: 500 })
    }

    return NextResponse.json({ spotlights: spotlights || [] })
  } catch (error) {
    console.error('Admin spotlights API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const allowedFields = ['title', 'content_type', 'content_url', 'content_body', 'is_active', 'display_order']

    const insert: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        insert[field] = body[field]
      }
    }

    if (!insert.title || !insert.content_type) {
      return NextResponse.json(
        { error: 'title and content_type are required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()
    const { data: spotlight, error: insertError } = await serviceClient
      .from('spotlight_content')
      .insert(insert)
      .select()
      .single()

    if (insertError) {
      console.error('Insert spotlight error:', insertError)
      return NextResponse.json({ error: 'Failed to create spotlight' }, { status: 500 })
    }

    return NextResponse.json({ spotlight }, { status: 201 })
  } catch (error) {
    console.error('Admin spotlights POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
