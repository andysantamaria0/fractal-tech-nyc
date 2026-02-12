/**
 * Grant hiring SPA access to a user by email.
 *
 * Usage: npx tsx scripts/grant-hiring-spa-access.ts <email>
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

const EMAIL = process.argv[2]
if (!EMAIL) {
  console.error('Usage: npx tsx scripts/grant-hiring-spa-access.ts <email>')
  process.exit(1)
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Find auth user by email
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const authUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === EMAIL.toLowerCase(),
  )

  let userId: string

  if (!authUser) {
    console.log(`No auth user found for ${EMAIL}. Creating one...`)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
    })
    if (createError || !newUser?.user) {
      console.error('Failed to create auth user:', createError?.message)
      process.exit(1)
    }
    userId = newUser.user.id
    console.log(`Created auth user: ${userId} (${EMAIL})`)
  } else {
    userId = authUser.id
    console.log(`Found existing auth user: ${userId} (${authUser.email})`)
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, has_hiring_spa_access')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.has_hiring_spa_access) {
    console.log('User already has hiring SPA access. Nothing to do.')
    return
  }

  if (profile) {
    // Update existing profile
    const { error } = await supabase
      .from('profiles')
      .update({ has_hiring_spa_access: true })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update profile:', error.message)
      process.exit(1)
    }
    console.log('Granted hiring SPA access (updated existing profile).')
  } else {
    // Create profile with access
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: EMAIL,
        name: EMAIL.split('@')[0],
        has_hiring_spa_access: true,
      })

    if (error) {
      console.error('Failed to create profile:', error.message)
      process.exit(1)
    }
    console.log('Granted hiring SPA access (created new profile).')
  }

  console.log(`\nDone. ${EMAIL} now has hiring SPA access.`)
}

main().catch(console.error)
