import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { testConnection } from '@/lib/hiring-spa/greenhouse'

export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    }

    const result = await testConnection(apiKey)
    return NextResponse.json(result)
  })
}
