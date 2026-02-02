import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin'

interface AdminContext {
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>
  userId?: string
}

/**
 * Wraps the common admin API route pattern:
 *   1. Verify admin auth
 *   2. Create service client
 *   3. Run handler
 *   4. Catch errors and return 500
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withAdmin(
  handler: (ctx: AdminContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const auth = await verifyAdmin()
    if (auth.error) return auth.error

    const serviceClient = await createServiceClient()
    return await handler({ serviceClient, userId: auth.userId })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
