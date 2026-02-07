import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { pickAllowedFields, ENGINEER_FIELDS } from '@/lib/api/field-validator'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const { data: engineers, error: fetchError } = await serviceClient
      .from('engineers')
      .select('*')
      .order('name')
      .limit(1000)

    if (fetchError) {
      console.error('Fetch engineers error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch engineers' }, { status: 500 })
    }

    return NextResponse.json({ engineers: engineers || [] })
  })
}

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const insert = pickAllowedFields(body, ENGINEER_FIELDS)

    if (!insert.name || !insert.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const { data: engineer, error: insertError } = await serviceClient
      .from('engineers')
      .insert(insert)
      .select()
      .single()

    if (insertError) {
      console.error('Insert engineer error:', insertError)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An engineer with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed to create engineer: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ engineer }, { status: 201 })
  })
}
