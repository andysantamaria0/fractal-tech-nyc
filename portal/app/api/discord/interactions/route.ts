import { NextResponse } from 'next/server'
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')

  const publicKey = process.env.DISCORD_PUBLIC_KEY
  if (!publicKey || !signature || !timestamp) {
    return NextResponse.json({ error: 'Bad request' }, { status: 401 })
  }

  const isValid = await verifyKey(body, signature, timestamp, publicKey)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const interaction = JSON.parse(body)

  // Handle PING (Discord verification handshake)
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG })
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data

    if (name === 'status') {
      return handleStatusCommand(interaction)
    }

    if (name === 'stats') {
      return handleStatsCommand()
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Unknown command.' },
    })
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
}

async function handleStatusCommand(interaction: { data: { options?: { name: string; value: string }[] } }) {
  const email = interaction.data.options?.find(o => o.name === 'email')?.value
  if (!email) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Please provide an email address.' },
    })
  }

  try {
    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
      .from('engineers')
      .select('id, name, email, status, created_at')
      .eq('email', email)
      .single()

    if (!profile) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `No engineer found with email \`${email}\`.` },
      })
    }

    const { count: matchCount } = await serviceClient
      .from('engineer_job_matches')
      .select('id', { count: 'exact', head: true })
      .eq('engineer_id', profile.id)

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: profile.name || 'Unknown',
            color: 0x4f46e5,
            fields: [
              { name: 'Email', value: profile.email, inline: true },
              { name: 'Status', value: profile.status, inline: true },
              { name: 'Matches', value: String(matchCount ?? 0), inline: true },
              { name: 'Signed Up', value: new Date(profile.created_at).toLocaleDateString(), inline: true },
            ],
          },
        ],
      },
    })
  } catch (err) {
    console.error('[discord/interactions] Status command error:', err)
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Failed to fetch engineer status.' },
    })
  }
}

async function handleStatsCommand() {
  try {
    const serviceClient = await createServiceClient()

    const [engineers, completeProfiles, matches, activeJobs] = await Promise.all([
      serviceClient
        .from('engineers')
        .select('id', { count: 'exact', head: true }),
      serviceClient
        .from('engineers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'complete'),
      serviceClient
        .from('engineer_job_matches')
        .select('id', { count: 'exact', head: true }),
      serviceClient
        .from('scanned_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: 'Fractal Portal Stats',
            color: 0x4f46e5,
            fields: [
              { name: 'Total Engineers', value: String(engineers.count ?? 0), inline: true },
              { name: 'Complete Profiles', value: String(completeProfiles.count ?? 0), inline: true },
              { name: 'Total Matches', value: String(matches.count ?? 0), inline: true },
              { name: 'Active Jobs', value: String(activeJobs.count ?? 0), inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })
  } catch (err) {
    console.error('[discord/interactions] Stats command error:', err)
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Failed to fetch stats.' },
    })
  }
}
