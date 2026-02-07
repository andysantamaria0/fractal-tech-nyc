import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createServiceClient()

    // Fetch the active role by public slug
    const { data: role, error } = await supabase
      .from('hiring_roles')
      .select('id, title, public_slug, status')
      .eq('public_slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Fetch company name from the hiring profile -> profiles chain
    const { data: hiringRole } = await supabase
      .from('hiring_roles')
      .select('hiring_profile_id')
      .eq('id', role.id)
      .single()

    let companyName = ''
    if (hiringRole) {
      const { data: hiringProfile } = await supabase
        .from('hiring_profiles')
        .select('company_id')
        .eq('id', hiringRole.hiring_profile_id)
        .maybeSingle()

      if (hiringProfile) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', hiringProfile.company_id)
          .maybeSingle()

        companyName = profile?.company_name || ''
      }
    }

    return NextResponse.json({
      title: role.title,
      company_name: companyName,
      slug: role.public_slug,
    })
  } catch (error) {
    console.error('Public JD metadata error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
