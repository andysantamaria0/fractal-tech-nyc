/**
 * Add an engineer to the engineers table.
 * Cleans up any incorrect profiles row that was created by mistake.
 *
 * Usage: npx tsx scripts/add-engineer.ts
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

const EMAIL = 'ethana@ethananderson.net'
const NAME = 'Ethan Anderson'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 1. Check if engineer row already exists
  const { data: existing } = await supabase
    .from('engineers')
    .select('id, email, status, auth_user_id')
    .ilike('email', EMAIL)
    .maybeSingle()

  if (existing) {
    console.log('Engineer row already exists:', existing)
  } else {
    // Insert new engineer row
    const { data: inserted, error: insertError } = await supabase
      .from('engineers')
      .insert({ name: NAME, email: EMAIL, status: 'draft' })
      .select('id, email, status')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError.message)
      process.exit(1)
    }

    console.log('Created engineer row:', inserted)
  }

  // 2. Clean up incorrect profiles row (created by the old grant-hiring-spa-access script)
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const authUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === EMAIL.toLowerCase(),
  )

  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, has_hiring_spa_access')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile) {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', authUser.id)

      if (deleteError) {
        console.error('Failed to delete stale profiles row:', deleteError.message)
      } else {
        console.log('Deleted stale profiles row for', EMAIL)
      }
    } else {
      console.log('No profiles row to clean up')
    }

    // Leave the auth user in place — magic link flow will reuse it
    console.log('Auth user exists (id:', authUser.id, ') — will be reused by magic link flow')
  } else {
    console.log('No auth user found for', EMAIL, '— one will be created when they log in')
  }

  console.log('\nDone. Ethan can now:')
  console.log('  1. Go to eng.fractaltech.nyc')
  console.log('  2. Enter his email → magic link sent')
  console.log('  3. Click link → redirected to /engineer/onboard')
  console.log('  4. Complete questionnaire → get job matches')
}

main().catch(console.error)
