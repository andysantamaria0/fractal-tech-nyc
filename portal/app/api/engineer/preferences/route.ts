import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { MatchingPreferences } from '@/lib/hiring-spa/types'

const VALID_TYPES: (keyof MatchingPreferences)[] = [
  'excluded_locations',
  'excluded_companies',
  'excluded_company_domains',
  'excluded_keywords',
]

const EMPTY_PREFS: MatchingPreferences = {
  excluded_locations: [],
  excluded_companies: [],
  excluded_company_domains: [],
  excluded_keywords: [],
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('matching_preferences')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const prefs: MatchingPreferences = {
      ...EMPTY_PREFS,
      ...(profile.matching_preferences as MatchingPreferences | null),
    }

    return NextResponse.json({ preferences: prefs })
  } catch (err) {
    console.error('[engineer/preferences] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, value } = body as { type: keyof MatchingPreferences; value: string }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid preference type' }, { status: 400 })
    }

    if (!value || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    const trimmed = value.trim()
    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id, matching_preferences')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const prefs: MatchingPreferences = {
      ...EMPTY_PREFS,
      ...(profile.matching_preferences as MatchingPreferences | null),
    }

    // Dedup case-insensitive
    const existing = prefs[type] || []
    const alreadyExists = existing.some(
      (v: string) => v.toLowerCase() === trimmed.toLowerCase(),
    )

    if (!alreadyExists) {
      prefs[type] = [...existing, trimmed]
    }

    const { error: updateError } = await serviceClient
      .from('engineer_profiles_spa')
      .update({ matching_preferences: prefs })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer/preferences] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: prefs })
  } catch (err) {
    console.error('[engineer/preferences] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, value } = body as { type: keyof MatchingPreferences; value: string }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid preference type' }, { status: 400 })
    }

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
      .from('engineer_profiles_spa')
      .select('id, matching_preferences')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const prefs: MatchingPreferences = {
      ...EMPTY_PREFS,
      ...(profile.matching_preferences as MatchingPreferences | null),
    }

    const existing = prefs[type] || []
    prefs[type] = existing.filter(
      (v: string) => v.toLowerCase() !== value.toLowerCase(),
    )

    const { error: updateError } = await serviceClient
      .from('engineer_profiles_spa')
      .update({ matching_preferences: prefs })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[engineer/preferences] Delete error:', updateError)
      return NextResponse.json({ error: 'Failed to remove preference' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: prefs })
  } catch (err) {
    console.error('[engineer/preferences] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
