import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: engineerId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if interest already exists
    const { data: existing } = await supabase
      .from('engineer_interests')
      .select('id')
      .eq('engineer_id', engineerId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Remove interest
      await supabase
        .from('engineer_interests')
        .delete()
        .eq('engineer_id', engineerId)
        .eq('user_id', user.id)

      return NextResponse.json({ interested: false })
    }

    // Add interest
    const { error } = await supabase
      .from('engineer_interests')
      .insert({ engineer_id: engineerId, user_id: user.id })

    if (error) {
      console.error('Interest insert error:', error)
      return NextResponse.json({ error: 'Failed to express interest' }, { status: 500 })
    }

    return NextResponse.json({ interested: true })
  } catch (error) {
    console.error('Interest API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
