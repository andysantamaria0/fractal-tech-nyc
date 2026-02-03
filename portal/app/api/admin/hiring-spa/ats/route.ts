import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

function maskApiKey(key: string): string {
  if (key.length <= 4) return '••••••••'
  return '••••••••' + key.slice(-4)
}

export async function GET(request: NextRequest) {
  return withAdmin(async ({ serviceClient }) => {
    const companyId = request.nextUrl.searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const { data, error } = await serviceClient
      .from('ats_connections')
      .select('id, company_id, provider, api_key, last_sync_at, last_sync_error, last_sync_role_count, created_at, updated_at')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      console.error('Fetch ATS connection error:', error)
      return NextResponse.json({ error: 'Failed to fetch ATS connection' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ connection: null })
    }

    return NextResponse.json({
      connection: {
        ...data,
        api_key: maskApiKey(data.api_key),
      },
    })
  })
}

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { companyId, provider, apiKey } = body

    if (!companyId || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'companyId, provider, and apiKey are required' },
        { status: 400 }
      )
    }

    if (provider !== 'greenhouse') {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    const { data, error } = await serviceClient
      .from('ats_connections')
      .upsert(
        {
          company_id: companyId,
          provider,
          api_key: apiKey,
          last_sync_error: null,
        },
        { onConflict: 'company_id,provider' }
      )
      .select('id, company_id, provider, last_sync_at, last_sync_error, last_sync_role_count, created_at, updated_at')
      .single()

    if (error) {
      console.error('Upsert ATS connection error:', error)
      return NextResponse.json({ error: 'Failed to save ATS connection' }, { status: 500 })
    }

    return NextResponse.json({ connection: data })
  })
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { companyId, provider } = body

    if (!companyId || !provider) {
      return NextResponse.json(
        { error: 'companyId and provider are required' },
        { status: 400 }
      )
    }

    const { error } = await serviceClient
      .from('ats_connections')
      .delete()
      .eq('company_id', companyId)
      .eq('provider', provider)

    if (error) {
      console.error('Delete ATS connection error:', error)
      return NextResponse.json({ error: 'Failed to delete ATS connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })
}
