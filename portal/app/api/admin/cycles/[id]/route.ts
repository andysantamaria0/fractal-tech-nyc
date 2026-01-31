import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const serviceClient = await createServiceClient()
    const { data: submission, error: fetchError } = await serviceClient
      .from('feature_submissions')
      .select(`
        *,
        profiles!feature_submissions_user_id_fkey (name, email, company_linkedin, hubspot_contact_id, hubspot_company_id),
        assigned_engineer:engineers!feature_submissions_assigned_engineer_id_fkey (id, name, email),
        preferred_engineer:engineers!feature_submissions_preferred_engineer_id_fkey (id, name)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Admin cycles detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error: authError, userId } = await verifyAdmin()
    if (authError) return authError

    const body = await request.json()
    const serviceClient = await createServiceClient()

    // Fetch current submission for audit trail
    const { data: current } = await serviceClient
      .from('feature_submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Build update and audit entries
    const allowedFields = [
      'status', 'assigned_engineer_id', 'internal_notes',
      'sprint_start_date', 'sprint_end_date', 'hours_budget',
      'hours_logged', 'cancelled_reason',
    ]

    const updates: Record<string, unknown> = {}
    const historyEntries: { field_name: string; old_value: string | null; new_value: string | null }[] = []

    for (const field of allowedFields) {
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
  } catch (error) {
    console.error('Admin cycles PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
