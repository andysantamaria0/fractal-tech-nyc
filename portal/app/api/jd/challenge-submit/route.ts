import { NextResponse, after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runAutoGrade } from '@/lib/hiring-spa/challenge-grader'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, email, text_response, link_url, file_url, file_name } = body as {
      slug: string
      email: string
      text_response?: string
      link_url?: string
      file_url?: string
      file_name?: string
    }

    if (!slug || !email) {
      return NextResponse.json({ error: 'slug and email are required' }, { status: 400 })
    }

    if (!text_response && !link_url && !file_url) {
      return NextResponse.json({ error: 'At least one of text_response, link_url, or file_url is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Look up role by slug
    const { data: role, error: roleError } = await supabase
      .from('hiring_roles')
      .select('id')
      .eq('public_slug', slug)
      .eq('status', 'active')
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Look up engineer by email
    const { data: engineer, error: engineerError } = await supabase
      .from('engineer_profiles_spa')
      .select('id')
      .eq('email', email)
      .single()

    if (engineerError || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Find match
    const { data: match, error: matchError } = await supabase
      .from('hiring_spa_matches')
      .select('id, challenge_response')
      .eq('role_id', role.id)
      .eq('engineer_id', engineer.id)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.challenge_response !== 'accepted') {
      return NextResponse.json({ error: 'Challenge must be accepted before submitting' }, { status: 400 })
    }

    // Insert submission (UNIQUE on match_id prevents duplicates)
    const { data: submission, error: insertError } = await supabase
      .from('challenge_submissions')
      .insert({
        match_id: match.id,
        text_response: text_response || null,
        link_url: link_url || null,
        file_url: file_url || null,
        file_name: file_name || null,
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Submission already exists for this match' }, { status: 409 })
      }
      console.error('Error inserting submission:', insertError)
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
    }

    // Run auto-grading in background
    after(async () => {
      const serviceClient = await createServiceClient()
      await runAutoGrade(submission.id, serviceClient)
    })

    return NextResponse.json({ success: true, submission_id: submission.id })
  } catch (error) {
    console.error('Challenge submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
