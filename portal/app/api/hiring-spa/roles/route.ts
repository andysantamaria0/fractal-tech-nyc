import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFromUrl, extractFromText } from '@/lib/hiring-spa/jd-extract'
import type { HiringRole, ExtractedJD } from '@/lib/hiring-spa/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the company's hiring profile
    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('id')
      .eq('company_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ roles: [] })
    }

    // RLS ensures company can only read their own roles
    const { data: roles, error } = await supabase
      .from('hiring_roles')
      .select('*')
      .eq('hiring_profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    return NextResponse.json({ roles: roles as HiringRole[] })
  } catch (error) {
    console.error('Hiring spa roles list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { url, title, raw_text, urls } = body as { url?: string; title?: string; raw_text?: string; urls?: string[] }

    if (!url && !raw_text && (!urls || urls.length === 0)) {
      return NextResponse.json({ error: 'Provide a URL, raw text, or an array of URLs' }, { status: 400 })
    }

    // Get the company's hiring profile
    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('id')
      .eq('company_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No hiring profile found. Complete your profile first.' }, { status: 400 })
    }

    // Batch URL mode
    if (urls && urls.length > 0) {
      const roles: HiringRole[] = []
      const extracted: ExtractedJD[] = []
      const errors: string[] = []

      for (const u of urls) {
        try {
          const ext = await extractFromUrl(u)
          const { data: role, error } = await supabase
            .from('hiring_roles')
            .insert({
              hiring_profile_id: profile.id,
              source_url: u,
              source_content: ext.raw_text,
              title: ext.title,
              status: 'draft',
            })
            .select('*')
            .single()

          if (error || !role) {
            errors.push(`Failed to create role from ${u}`)
            continue
          }
          roles.push(role as HiringRole)
          extracted.push(ext)
        } catch (err) {
          errors.push(`Failed to extract ${u}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      if (roles.length === 0) {
        return NextResponse.json({ error: errors.join('; ') || 'Failed to create any roles' }, { status: 400 })
      }

      return NextResponse.json({ roles, extracted, errors: errors.length > 0 ? errors : undefined })
    }

    // Single URL or raw text mode
    let extractedJD: ExtractedJD
    try {
      if (url) {
        extractedJD = await extractFromUrl(url)
      } else {
        extractedJD = await extractFromText(title || 'Untitled Role', raw_text!)
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to extract JD: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Create the role
    const { data: role, error } = await supabase
      .from('hiring_roles')
      .insert({
        hiring_profile_id: profile.id,
        source_url: url || null,
        source_content: extractedJD.raw_text,
        title: extractedJD.title,
        status: 'draft',
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating role:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json({ role: role as HiringRole, extracted: extractedJD })
  } catch (error) {
    console.error('Hiring spa role create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
