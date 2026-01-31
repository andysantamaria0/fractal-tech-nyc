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
    const { data: spotlight, error: fetchError } = await serviceClient
      .from('spotlight_content')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !spotlight) {
      return NextResponse.json({ error: 'Spotlight not found' }, { status: 404 })
    }

    return NextResponse.json({ spotlight })
  } catch (error) {
    console.error('Admin spotlight GET error:', error)
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
    const allowedFields = ['title', 'content_type', 'content_url', 'content_body', 'is_active', 'display_order']

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
    const { data: spotlight, error: updateError } = await serviceClient
      .from('spotlight_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update spotlight error:', updateError)
      return NextResponse.json({ error: 'Failed to update spotlight' }, { status: 500 })
    }

    if (!spotlight) {
      return NextResponse.json({ error: 'Spotlight not found' }, { status: 404 })
    }

    return NextResponse.json({ spotlight })
  } catch (error) {
    console.error('Admin spotlight PATCH error:', error)
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
      .from('spotlight_content')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete spotlight error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete spotlight' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin spotlight DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
