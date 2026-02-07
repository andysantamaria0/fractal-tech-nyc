import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MatchMovedForwardEmail } from '@/emails/match-moved-forward'
import { EngineerMatchNotificationEmail } from '@/emails/engineer-match-notification'
import { MatchesReadyEmail } from '@/emails/matches-ready'
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
    .select('*, engineer:engineers(name, email)')
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
  const rawEngineer = match.engineer as { name: string } | { name: string }[] | null
  const engineerObj = Array.isArray(rawEngineer) ? rawEngineer[0] : rawEngineer
  const engineerName = engineerObj?.name || 'Unknown Engineer'
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

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
      to: fractalEmail,
      subject: `${companyName} wants to move forward with ${engineerName} for ${role.title}`,
      html,
    })
  } catch (err) {
    console.error(`[notifications] Failed to send match-moved-forward email for match ${matchId}:`, err)
    throw err
  }
}

/**
 * Send a notification email to an engineer when a company moves forward on their match.
 * Fire-and-forget — caller should .catch() errors.
 */
export async function notifyEngineerOfMatch(
  matchId: string,
  serviceClient: SupabaseClient,
): Promise<void> {
  // Fetch match with engineer
  const { data: match, error: matchError } = await serviceClient
    .from('hiring_spa_matches')
    .select('*, engineer:engineers(name, email)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  // Fetch role + hiring profile for company name
  const { data: role, error: roleError } = await serviceClient
    .from('hiring_roles')
    .select('title, public_slug, hiring_profile_id')
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

  const { data: companyProfile } = await serviceClient
    .from('profiles')
    .select('company_name')
    .eq('id', profile.company_id)
    .single()

  const companyName = companyProfile?.company_name || 'Unknown Company'
  const rawEngineer2 = match.engineer as { name: string; email: string } | { name: string; email: string }[] | null
  const engineer = Array.isArray(rawEngineer2) ? rawEngineer2[0] : rawEngineer2
  const engineerEmail = engineer?.email

  if (!engineerEmail) {
    throw new Error(`Engineer email not found for match: ${matchId}`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fractaltech.nyc'
  const jdUrl = `${baseUrl}/jd/${role.public_slug}`

  const html = EngineerMatchNotificationEmail({
    companyName,
    roleTitle: role.title,
    overallScore: match.overall_score,
    highlightQuote: match.highlight_quote,
    jdUrl,
  })

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
      to: engineerEmail,
      subject: `${companyName} is interested in you for ${role.title}`,
      html,
    })
  } catch (err) {
    console.error(`[notifications] Failed to send engineer-of-match email for match ${matchId}:`, err)
    throw err
  }

  // Mark engineer as notified
  await serviceClient
    .from('hiring_spa_matches')
    .update({ engineer_notified_at: new Date().toISOString() })
    .eq('id', matchId)
}

/**
 * Send a notification email to an engineer when their job matches are ready.
 * Called after computeMatchesForEngineer completes with results.
 * Fire-and-forget — caller should .catch() errors.
 */
export async function notifyEngineerMatchesReady(
  engineerProfileId: string,
  matchCount: number,
  serviceClient: SupabaseClient,
): Promise<void> {
  if (matchCount <= 0) return

  const { data: profile, error } = await serviceClient
    .from('engineers')
    .select('name, email')
    .eq('id', engineerProfileId)
    .single()

  if (error || !profile) {
    throw new Error(`Engineer profile not found: ${engineerProfileId}`)
  }

  if (!profile.email) {
    throw new Error(`No email for engineer profile: ${engineerProfileId}`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eng.fractaltech.nyc'
  const dashboardUrl = `${baseUrl}/engineer/matches`

  const html = MatchesReadyEmail({
    engineerName: profile.name || 'there',
    matchCount,
    dashboardUrl,
  })

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fractal <portal@fractaltech.nyc>',
      to: profile.email,
      subject: `Your top ${matchCount} job match${matchCount === 1 ? '' : 'es'} ${matchCount === 1 ? 'is' : 'are'} ready`,
      html,
    })
  } catch (err) {
    console.error(`[notifications] Failed to send matches-ready email to ${profile.email}:`, err)
    throw err
  }

  console.log(`[notifications] Sent matches-ready email to ${profile.email} (${matchCount} matches)`)
}
