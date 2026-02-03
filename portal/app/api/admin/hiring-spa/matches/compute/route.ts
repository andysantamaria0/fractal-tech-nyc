import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { computeMatchesForRole } from '@/lib/hiring-spa/matching'

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient }) => {
    const { role_id } = await request.json()

    if (!role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    // Validate role exists and has a beautified JD
    const { data: role, error: roleError } = await serviceClient
      .from('hiring_roles')
      .select('id, beautified_jd, status')
      .eq('id', role_id)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (!role.beautified_jd) {
      return NextResponse.json(
        { error: 'Role must have a beautified JD before computing matches' },
        { status: 400 },
      )
    }

    const result = await computeMatchesForRole(role_id, serviceClient)

    return NextResponse.json({
      matches: result.matches,
      count: result.matches.length,
    })
  })
}
