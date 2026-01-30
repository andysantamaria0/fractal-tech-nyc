import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const engineerId = searchParams.get('engineer_id')
    const companyId = searchParams.get('company_id')
    const overdueOnly = searchParams.get('overdue') === 'true'
    const unassignedOnly = searchParams.get('unassigned') === 'true'
    const hiringOnly = searchParams.get('hiring') === 'true'

    const serviceClient = await createServiceClient()
    let query = serviceClient
      .from('feature_submissions')
      .select(`
        *,
        profiles!feature_submissions_user_id_fkey (name, email, company_linkedin),
        assigned_engineer:engineers!feature_submissions_assigned_engineer_id_fkey (id, name),
        preferred_engineer:engineers!feature_submissions_preferred_engineer_id_fkey (id, name)
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (engineerId) {
      query = query.eq('assigned_engineer_id', engineerId)
    }

    if (unassignedOnly) {
      query = query.is('assigned_engineer_id', null)
    }

    if (hiringOnly) {
      query = query.eq('is_hiring', true)
    }

    const { data: submissions, error: fetchError } = await query

    if (fetchError) {
      console.error('Fetch submissions error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Filter overdue client-side (sprint_end_date < now AND status is in_progress)
    let filtered = submissions || []
    if (overdueOnly) {
      const now = new Date().toISOString().split('T')[0]
      filtered = filtered.filter(
        (s) => s.sprint_end_date && s.sprint_end_date < now && s.status === 'in_progress'
      )
    }

    // Filter by company via profile user_id if companyId specified
    if (companyId) {
      filtered = filtered.filter((s) => s.user_id === companyId)
    }

    return NextResponse.json({ submissions: filtered })
  } catch (error) {
    console.error('Admin cycles API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
