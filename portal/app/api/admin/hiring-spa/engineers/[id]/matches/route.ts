import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { computeMatchesForEngineer } from '@/lib/hiring-spa/job-matching'
import { notifyEngineerMatchesReady } from '@/lib/hiring-spa/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(async ({ serviceClient }) => {
    const { id } = await params

    const { data: engineer, error } = await serviceClient
      .from('engineers')
      .select('id, name, status')
      .eq('id', id)
      .single()

    if (error || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    if (engineer.status !== 'complete') {
      return NextResponse.json(
        { error: `Engineer status is '${engineer.status}', must be 'complete'` },
        { status: 400 },
      )
    }

    const result = await computeMatchesForEngineer(id, serviceClient)

    if (result.matches.length > 0) {
      await notifyEngineerMatchesReady(id, result.matches.length, serviceClient)
    }

    return NextResponse.json({
      engineer: engineer.name,
      matches: result.matches,
      count: result.matches.length,
    })
  })
}
