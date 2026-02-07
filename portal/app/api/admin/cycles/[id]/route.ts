import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { SUBMISSION_FIELDS } from '@/lib/api/field-validator'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params
    const { data: submission, error: fetchError } = await serviceClient
      .from('feature_submissions')
      .select(`
        *,
        profiles!feature_submissions_user_id_fkey (name, email, company_linkedin, hubspot_contact_id, hubspot_company_id),
        assigned_engineer:engineers!feature_submissions_assigned_engineer_id_fkey (id, name, email),
        preferred_engineer:engineers!feature_submissions_preferred_engineer_id_fkey (id, name)
      `)
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json({ submission })
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async ({ serviceClient, userId }) => {
    const { id } = await params
    const body = await request.json()

    // Fetch current submission for audit trail
    const { data: current } = await serviceClient
      .from('feature_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Build update and audit entries
    const updates: Record<string, unknown> = {}
    const historyEntries: { field_name: string; old_value: string | null; new_value: string | null }[] = []

    for (const field of SUBMISSION_FIELDS) {
      if (field in body && body[field] !== current[field as keyof typeof current]) {
        updates[field] = body[field]
        historyEntries.push({
          field_name: field,
          old_value: current[field as keyof typeof current]?.toString() ?? null,
          new_value: body[field]?.toString() ?? null,
        })
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ submission: current })
    }

    // Apply update
    const { data: updated, error: updateError } = await serviceClient
      .from('feature_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    // Insert audit trail entries
    if (historyEntries.length > 0) {
      await serviceClient.from('submission_history').insert(
        historyEntries.map((entry) => ({
          submission_id: id,
          changed_by: userId ?? null,
          ...entry,
          note: body.audit_note || null,
        }))
      )
    }

    return NextResponse.json({ submission: updated })
  })
}
