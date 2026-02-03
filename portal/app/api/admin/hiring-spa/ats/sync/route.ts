import { NextResponse, after } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { syncGreenhouseRoles } from '@/lib/hiring-spa/ats-sync'

export const maxDuration = 60

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Look up stored API key
    const { data: connection, error: connError } = await serviceClient
      .from('ats_connections')
      .select('api_key, provider')
      .eq('company_id', companyId)
      .eq('provider', 'greenhouse')
      .single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'No Greenhouse connection found for this company' },
        { status: 404 }
      )
    }

    // Run sync in background after response is sent
    after(async () => {
      try {
        await syncGreenhouseRoles({
          companyId,
          apiKey: connection.api_key,
          serviceClient,
        })
      } catch (err) {
        console.error('Greenhouse sync error:', err)
        // Record the error on the connection
        await serviceClient
          .from('ats_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_error: err instanceof Error ? err.message : String(err),
          })
          .eq('company_id', companyId)
          .eq('provider', 'greenhouse')
      }
    })

    return NextResponse.json({ status: 'syncing' })
  })
}
