/**
 * Update Ethan Anderson's preferences based on his onboarding session feedback.
 *
 * Changes:
 *   1. Add "Remote" to preferred_locations (he said location "doesn't really matter to me")
 *   2. Enrich questionnaire answers with session insights:
 *      - work_preferences.environment_type: small company preference, ownership, visibility
 *      - career_growth.exciting_problems: tooling, pipeline optimization, UX ownership
 *      - strengths: post-production pipeline experience
 *
 * Usage: npx tsx scripts/update-ethan-preferences.ts [--dry-run]
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const EMAIL = 'ethana@ethananderson.net'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log(`=== Update Ethan's Preferences ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  // Fetch Ethan's profile
  const { data: engineer, error } = await supabase
    .from('engineers')
    .select('id, name, email, status, preferred_locations, work_preferences, career_growth, strengths')
    .ilike('email', EMAIL)
    .maybeSingle()

  if (error || !engineer) {
    console.error('Engineer not found:', error?.message || 'no rows')
    process.exit(1)
  }

  console.log(`Found: ${engineer.name} (${engineer.email})`)
  console.log(`Status: ${engineer.status}`)
  console.log(`Current locations: ${JSON.stringify(engineer.preferred_locations)}`)
  console.log()

  // 1. Add "Remote" to preferred_locations
  const currentLocations: string[] = engineer.preferred_locations || []
  const hasRemote = currentLocations.some(l => l.toLowerCase() === 'remote')
  const newLocations = hasRemote ? currentLocations : [...currentLocations, 'Remote']

  console.log(`--- Location Update ---`)
  if (!hasRemote) {
    console.log(`  Adding "Remote" to preferred_locations`)
    console.log(`  ${JSON.stringify(currentLocations)} → ${JSON.stringify(newLocations)}`)
  } else {
    console.log(`  "Remote" already present — no change`)
  }
  console.log()

  // 2. Enrich questionnaire answers with session insights
  // We APPEND to existing answers, never overwrite
  const workPrefs = (engineer.work_preferences || {}) as Record<string, string>
  const careerGrowth = (engineer.career_growth || {}) as Record<string, string>
  const strengthsData = (engineer.strengths || {}) as Record<string, string>

  // Helper: append text to existing answer
  function enrich(current: string | undefined, addition: string): string {
    if (!current?.trim()) return addition
    if (current.toLowerCase().includes(addition.toLowerCase().slice(0, 30))) {
      return current // already contains similar text
    }
    return `${current.trim()} ${addition}`
  }

  const updatedWorkPrefs = {
    ...workPrefs,
    environment_type: enrich(
      workPrefs.environment_type,
      'I prefer small companies (under 50 people, ideally under 20). I want ownership over projects with high visibility — smaller teams mean more opportunities to prove your worth.',
    ),
  }

  const updatedCareerGrowth = {
    ...careerGrowth,
    exciting_problems: enrich(
      careerGrowth.exciting_problems,
      'I\'m also very interested in developer tooling and pipeline optimization, not just consumer-facing products. My post-production background means I think naturally about optimizing end-to-end pipelines. I\'m looking for product engineer or design engineer roles where I have ownership over the user experience and visual quality.',
    ),
  }

  const updatedStrengths = {
    ...strengthsData,
    genuinely_great_at: enrich(
      strengthsData.genuinely_great_at,
      'I bring a unique perspective from film post-production and pipeline management — I\'m always thinking about how to optimize workflows end-to-end and build polished, high-quality user experiences.',
    ),
  }

  console.log(`--- Questionnaire Enrichment ---`)
  console.log()
  console.log(`  work_preferences.environment_type:`)
  console.log(`    BEFORE: "${workPrefs.environment_type || '(empty)'}"`)
  console.log(`    AFTER:  "${updatedWorkPrefs.environment_type}"`)
  console.log()
  console.log(`  career_growth.exciting_problems:`)
  console.log(`    BEFORE: "${careerGrowth.exciting_problems || '(empty)'}"`)
  console.log(`    AFTER:  "${updatedCareerGrowth.exciting_problems}"`)
  console.log()
  console.log(`  strengths.genuinely_great_at:`)
  console.log(`    BEFORE: "${strengthsData.genuinely_great_at || '(empty)'}"`)
  console.log(`    AFTER:  "${updatedStrengths.genuinely_great_at}"`)
  console.log()

  if (DRY_RUN) {
    console.log('DRY RUN — no changes written')
    return
  }

  // Write updates
  const { error: updateError } = await supabase
    .from('engineers')
    .update({
      preferred_locations: newLocations,
      work_preferences: updatedWorkPrefs,
      career_growth: updatedCareerGrowth,
      strengths: updatedStrengths,
    })
    .eq('id', engineer.id)

  if (updateError) {
    console.error('Update failed:', updateError.message)
    process.exit(1)
  }

  console.log('Updates written successfully.')
  console.log()
  console.log('Next steps:')
  console.log('  1. Re-generate profile summary (admin UI or re-run questionnaire)')
  console.log('  2. Re-compute matches to see improved results')
}

main().catch(console.error)
