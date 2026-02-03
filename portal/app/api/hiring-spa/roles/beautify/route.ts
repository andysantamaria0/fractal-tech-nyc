import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { beautifyJD } from '@/lib/hiring-spa/beautify'
import { extractFromText } from '@/lib/hiring-spa/jd-extract'
import { computeMatchesForRole } from '@/lib/hiring-spa/matching'
import type {
  HiringRole,
  CompanyDNA,
  TechnicalEnvironment,
  ProfileSummary,
  JDFeedback,
  BeautifiedJD,
} from '@/lib/hiring-spa/types'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { role_id, role_ids, feedback } = body as { role_id?: string; role_ids?: string[]; feedback?: JDFeedback }

    // Batch mode
    if (role_ids && role_ids.length > 0) {
      const roles: HiringRole[] = []
      for (const rid of role_ids) {
        const { data: batchRole, error: batchRoleError } = await supabase
          .from('hiring_roles')
          .select('*')
          .eq('id', rid)
          .single()

        if (batchRoleError || !batchRole) continue
        const typedBatchRole = batchRole as HiringRole
        if (!typedBatchRole.source_content) continue

        await supabase.from('hiring_roles').update({ status: 'beautifying' }).eq('id', rid)

        const { data: batchProfile } = await supabase
          .from('hiring_profiles')
          .select('company_dna, technical_environment, profile_summary')
          .eq('id', typedBatchRole.hiring_profile_id)
          .single()

        const batchExtracted = await extractFromText(typedBatchRole.title, typedBatchRole.source_content)
        const batchBeautified = await beautifyJD({
          extractedJD: batchExtracted,
          profileSummary: (batchProfile?.profile_summary as ProfileSummary) || null,
          companyDna: (batchProfile?.company_dna as CompanyDNA) || null,
          technicalEnvironment: (batchProfile?.technical_environment as TechnicalEnvironment) || null,
          feedback: null,
          previousBeautifiedJD: null,
        })

        const { data: updatedBatchRole } = await supabase
          .from('hiring_roles')
          .update({ beautified_jd: batchBeautified, status: 'active', jd_feedback: null })
          .eq('id', rid)
          .select('*')
          .single()

        if (updatedBatchRole) {
          roles.push(updatedBatchRole as HiringRole)
          createServiceClient().then(sc => computeMatchesForRole(rid, sc)).catch(console.error)
        }
      }
      return NextResponse.json({ roles })
    }

    if (!role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    // Fetch the role (RLS ensures ownership)
    const { data: role, error: roleError } = await supabase
      .from('hiring_roles')
      .select('*')
      .eq('id', role_id)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const typedRole = role as HiringRole

    if (!typedRole.source_content) {
      return NextResponse.json({ error: 'Role has no source content to beautify' }, { status: 400 })
    }

    // Update status to beautifying
    await supabase
      .from('hiring_roles')
      .update({ status: 'beautifying' })
      .eq('id', role_id)

    // Fetch the company's hiring profile for context
    const { data: profile } = await supabase
      .from('hiring_profiles')
      .select('company_dna, technical_environment, profile_summary')
      .eq('id', typedRole.hiring_profile_id)
      .single()

    // Build extracted JD from stored content
    const extracted = await extractFromText(typedRole.title, typedRole.source_content)

    // Beautify the JD
    const beautifiedJD = await beautifyJD({
      extractedJD: extracted,
      profileSummary: (profile?.profile_summary as ProfileSummary) || null,
      companyDna: (profile?.company_dna as CompanyDNA) || null,
      technicalEnvironment: (profile?.technical_environment as TechnicalEnvironment) || null,
      feedback: feedback || null,
      previousBeautifiedJD: feedback ? (typedRole.beautified_jd as BeautifiedJD) : null,
    })

    // Save beautified JD, update status, and clear feedback after re-beautification
    const { data: updatedRole, error: updateError } = await supabase
      .from('hiring_roles')
      .update({
        beautified_jd: beautifiedJD,
        status: 'active',
        jd_feedback: null,
      })
      .eq('id', role_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error saving beautified JD:', updateError)
      return NextResponse.json({ error: 'Failed to save beautified JD' }, { status: 500 })
    }

    // Fire-and-forget: compute matches for this role in background
    createServiceClient().then(sc => computeMatchesForRole(role_id, sc)).catch(console.error)

    return NextResponse.json({ role: updatedRole as HiringRole })
  } catch (error) {
    console.error('Hiring spa beautify error:', error)

    // Try to reset status on error
    try {
      const body = await request.clone().json()
      if (body.role_id) {
        const supabase = await createClient()
        await supabase
          .from('hiring_roles')
          .update({ status: 'draft' })
          .eq('id', body.role_id)
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
