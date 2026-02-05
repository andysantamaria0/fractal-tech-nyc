const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

export async function notifyDiscordEngineerSignup(params: {
  name: string
  email: string
  githubUrl?: string
  linkedinUrl?: string
}) {
  if (!DISCORD_WEBHOOK_URL) return

  const fields = [
    { name: 'Name', value: params.name, inline: true },
    { name: 'Email', value: params.email, inline: true },
  ]

  if (params.githubUrl) {
    fields.push({ name: 'GitHub', value: params.githubUrl, inline: false })
  }
  if (params.linkedinUrl) {
    fields.push({ name: 'LinkedIn', value: params.linkedinUrl, inline: false })
  }

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '🎉 New Engineer Signup',
          color: 0x4ade80,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })
}

export async function notifyDiscordMatchesComputed(params: {
  engineerName: string
  matchCount: number
}) {
  if (!DISCORD_WEBHOOK_URL) return

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '🎯 Job Matches Computed',
          color: 0xfbbf24,
          fields: [
            { name: 'Engineer', value: params.engineerName, inline: true },
            { name: 'Matches', value: `${params.matchCount} jobs`, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })
}
