import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MatchMovedForwardEmail } from '@/emails/match-moved-forward'
import type { DimensionWeights } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send a notification email to Fractal when a company moves forward on a match.
 * Fire-and-forget — caller should .catch() errors.
 */
export async function notifyMatchMovedForward(
  matchId: string,
  serviceClient: SupabaseClient,
): Promise<void> {
  // Fetch match with engineer
  const { data: match, error: matchError } = await serviceClient
    .from('hiring_spa_matches')
    .select('*, engineer:engineer_profiles_spa(name, email)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  // Fetch role + hiring profile for company name
  const { data: role, error: roleError } = await serviceClient
    .from('hiring_roles')
    .select('title, hiring_profile_id')
    .eq('id', match.role_id)
    .single()

  if (roleError || !role) {
    throw new Error(`Role not found for match: ${matchId}`)
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('hiring_profiles')
    .select('company_id')
    .eq('id', role.hiring_profile_id)
    .single()

  if (profileError || !profile) {
    throw new Error(`Hiring profile not found for match: ${matchId}`)
  }

  // Get company name from profiles table
  const { data: companyProfile } = await serviceClient
    .from('profiles')
    .select('company_name')
    .eq('id', profile.company_id)
    .single()

  const companyName = companyProfile?.company_name || 'Unknown Company'
  const engineerName = (match.engineer as { name: string })?.name || 'Unknown Engineer'
  const dimensionScores = match.dimension_scores as DimensionWeights

  const html = MatchMovedForwardEmail({
    companyName,
    roleTitle: role.title,
    engineerName,
    overallScore: match.overall_score,
    dimensionScores,
    highlightQuote: match.highlight_quote,
  })

  // Send to Fractal team
  const fractalEmail = process.env.FRACTAL_NOTIFICATION_EMAIL || 'team@fractaltech.nyc'

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
    to: fractalEmail,
    subject: `${companyName} wants to move forward with ${engineerName} for ${role.title}`,
    html,
  })
}
