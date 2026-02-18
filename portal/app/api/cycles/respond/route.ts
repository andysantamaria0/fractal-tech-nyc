import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company_name, contact_name, contact_email, interested_engineers, availability, notes } = body

    if (!company_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
      return NextResponse.json({ error: 'Company name, contact name, and email are required' }, { status: 400 })
    }

    if (!interested_engineers?.length) {
      return NextResponse.json({ error: 'Please select at least one engineer' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('cycles_responses')
      .insert({
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        contact_email: contact_email.trim(),
        interested_engineers,
        availability: availability || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Cycles response insert error:', error)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    return NextResponse.json({ response: data }, { status: 201 })
  } catch (err) {
    console.error('Cycles respond error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
