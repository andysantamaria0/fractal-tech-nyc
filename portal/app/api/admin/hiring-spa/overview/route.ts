import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function joinVal(joined: any, key: string): string | undefined {
  if (!joined) return undefined
  if (Array.isArray(joined)) return joined[0]?.[key]
  return joined[key]
}

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const [
      { data: companies, error: companiesErr },
      { data: roles, error: rolesErr },
      { data: engineers, error: engineersErr },
      { data: matches, error: matchesErr },
      { data: feedback, error: feedbackErr },
      { data: jdViews, error: jdViewsErr, count: jdViewCount },
    ] = await Promise.all([
      serviceClient
        .from('hiring_profiles')
        .select('id, company_id, status, crawl_error, created_at, profiles(name)'),
      serviceClient
        .from('hiring_roles')
        .select('id, hiring_profile_id, title, status, created_at'),
      serviceClient
        .from('engineer_profiles_spa')
        .select('id, name, email, status, crawl_error, created_at'),
      serviceClient
        .from('hiring_spa_matches')
        .select('id, role_id, engineer_id, overall_score, decision, decision_at, created_at, hiring_roles(title), engineer_profiles_spa(name)')
        .order('created_at', { ascending: false }),
      serviceClient
        .from('match_feedback')
        .select('id, match_id, hired, rating'),
      serviceClient
        .from('jd_page_views')
        .select('id', { count: 'exact', head: true }),
    ])

    // Core tables — fail if these are missing
    const coreErr = companiesErr || rolesErr || engineersErr || matchesErr
    if (coreErr) {
      console.error('Overview query error:', coreErr)
      return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 })
    }

    // Non-critical tables — log and continue with empty data
    if (feedbackErr) console.warn('match_feedback query failed (table may not exist):', feedbackErr.message)
    if (jdViewsErr) console.warn('jd_page_views query failed (table may not exist):', jdViewsErr.message)

    // --- Companies ---
    const companyByStatus: Record<string, number> = {}
    const companyErrors: { id: string; name: string; type: 'company'; error: string }[] = []
    for (const c of companies || []) {
      const s = c.status || 'unknown'
      companyByStatus[s] = (companyByStatus[s] || 0) + 1
      if (c.crawl_error) {
        companyErrors.push({
          id: c.id,
          name: joinVal(c.profiles, 'name') || c.company_id,
          type: 'company',
          error: c.crawl_error,
        })
      }
    }

    // --- Roles ---
    const roleByStatus: Record<string, number> = {}
    const roleIds = new Set<string>()
    for (const r of roles || []) {
      const s = r.status || 'unknown'
      roleByStatus[s] = (roleByStatus[s] || 0) + 1
      roleIds.add(r.id)
    }

    // --- Engineers ---
    const engineerByStatus: Record<string, number> = {}
    const engineerErrors: { id: string; name: string; type: 'engineer'; error: string }[] = []
    for (const e of engineers || []) {
      const s = e.status || 'unknown'
      engineerByStatus[s] = (engineerByStatus[s] || 0) + 1
      if (e.crawl_error) {
        engineerErrors.push({
          id: e.id,
          name: e.name,
          type: 'engineer',
          error: e.crawl_error,
        })
      }
    }

    // --- Matches ---
    const matchList = matches || []
    const rolesWithMatches = new Set<string>()
    let pendingCount = 0
    let movedForwardCount = 0
    let passedCount = 0
    let scoreSum = 0
    let scoreCount = 0
    const recentDecisions: { id: string; roleName: string; engineerName: string; decision: string; decisionAt: string }[] = []

    for (const m of matchList) {
      rolesWithMatches.add(m.role_id)
      if (m.decision === null || m.decision === undefined) pendingCount++
      else if (m.decision === 'moved_forward') movedForwardCount++
      else if (m.decision === 'passed') passedCount++

      if (m.overall_score != null) {
        scoreSum += m.overall_score
        scoreCount++
      }

      if (m.decision && m.decision_at && recentDecisions.length < 5) {
        recentDecisions.push({
          id: m.id,
          roleName: joinVal(m.hiring_roles, 'title') || 'Unknown',
          engineerName: joinVal(m.engineer_profiles_spa, 'name') || 'Unknown',
          decision: m.decision,
          decisionAt: m.decision_at,
        })
      }
    }

    const recentMatches = matchList.slice(0, 5).map((m) => {
      return {
        id: m.id,
        roleName: joinVal(m.hiring_roles, 'title') || 'Unknown',
        engineerName: joinVal(m.engineer_profiles_spa, 'name') || 'Unknown',
        score: m.overall_score,
        createdAt: m.created_at,
      }
    })

    // --- Roles without matches ---
    const rolesWithoutMatches = (roles || [])
      .filter((r) => (r.status === 'active' || r.status === 'published') && !rolesWithMatches.has(r.id))
      .map((r) => ({ id: r.id, title: r.title, status: r.status }))

    // --- Stale pending matches (> 7 days) ---
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const stalePendingMatches = matchList.filter(
      (m) => !m.decision && new Date(m.created_at).getTime() < sevenDaysAgo
    ).length

    // --- Feedback ---
    const feedbackList = feedback || []
    const hiredCount = feedbackList.filter((f) => f.hired).length
    const ratingSum = feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0)
    const ratingCount = feedbackList.filter((f) => f.rating != null).length

    // --- Recent engineers ---
    const sortedEngineers = [...(engineers || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const recentEngineers = sortedEngineers.slice(0, 5).map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      createdAt: e.created_at,
    }))

    return NextResponse.json({
      companies: {
        total: (companies || []).length,
        byStatus: companyByStatus,
        withErrors: companyErrors.length,
      },
      roles: {
        total: (roles || []).length,
        byStatus: roleByStatus,
      },
      engineers: {
        total: (engineers || []).length,
        byStatus: engineerByStatus,
      },
      matches: {
        total: matchList.length,
        pending: pendingCount,
        movedForward: movedForwardCount,
        passed: passedCount,
        avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      },
      feedback: {
        total: feedbackList.length,
        hired: hiredCount,
        avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      },
      jdViews: jdViewCount || 0,
      recentActivity: {
        recentMatches,
        recentDecisions,
        recentEngineers,
      },
      attention: {
        crawlErrors: [...companyErrors, ...engineerErrors],
        rolesWithoutMatches,
        stalePendingMatches,
      },
    })
  })
}
