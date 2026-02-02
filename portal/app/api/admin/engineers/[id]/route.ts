import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { pickAllowedFields, ENGINEER_FIELDS } from '@/lib/api/field-validator'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const body = await request.json()
    const updates = pickAllowedFields(body, ENGINEER_FIELDS)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: engineer, error: updateError } = await serviceClient
      .from('engineers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update engineer error:', updateError)
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'An engineer with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed to update engineer: ${updateError.message}` }, { status: 500 })
    }

    if (!engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    return NextResponse.json({ engineer })
  })
}
