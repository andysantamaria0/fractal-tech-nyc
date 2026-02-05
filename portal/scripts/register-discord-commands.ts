/**
 * One-time script to register Discord slash commands for the Fractal Portal bot.
 * Uses guild-scoped registration for instant availability.
 * Usage: npx tsx scripts/register-discord-commands.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const GUILD_ID = process.env.DISCORD_GUILD_ID!

if (!APPLICATION_ID || !BOT_TOKEN || !GUILD_ID) {
  console.error('Missing required env vars: DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID')
  process.exit(1)
}

const commands = [
  {
    name: 'status',
    description: 'Check an engineer\'s pipeline status',
    options: [
      {
        name: 'email',
        description: 'Engineer\'s email address',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'stats',
    description: 'Show Fractal Portal platform stats',
  },
]

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Failed to register commands: ${res.status} ${text}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`Registered ${data.length} commands:`)
  for (const cmd of data) {
    console.log(`  /${cmd.name} — ${cmd.description}`)
  }
}

registerCommands()
