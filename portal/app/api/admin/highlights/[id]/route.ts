import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { data: highlight, error: fetchError } = await serviceClient
      .from('weekly_highlights')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 })
    }

    return NextResponse.json({ highlight })
  } catch (error) {
    console.error('Admin highlight GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const body = await request.json()
    const allowedFields = ['week_number', 'cohort_start_date', 'title', 'description']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data: highlight, error: updateError } = await serviceClient
      .from('weekly_highlights')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Update highlight error:', updateError)
      return NextResponse.json({ error: 'Failed to update highlight' }, { status: 500 })
    }

    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 })
    }

    return NextResponse.json({ highlight })
  } catch (error) {
    console.error('Admin highlight PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    const { error: deleteError } = await serviceClient
      .from('weekly_highlights')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete highlight error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete highlight' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin highlight DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
