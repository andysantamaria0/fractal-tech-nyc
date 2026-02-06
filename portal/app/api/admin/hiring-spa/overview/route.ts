import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const [
      { data: engineers, error: engineersErr },
      { data: matchedEngineerIds, error: matchesErr },
      { data: applications, error: applicationsErr },
    ] = await Promise.all([
      serviceClient
        .from('engineers')
        .select('id, name, email, status, crawl_completed_at, questionnaire_completed_at, created_at'),
      serviceClient
        .from('engineer_job_matches')
        .select('engineer_id'),
      serviceClient
        .from('engineer_job_matches')
        .select('id, applied_at, feedback, engineer:engineers(name, email), scanned_job:scanned_jobs(company_name, job_title, location)')
        .not('applied_at', 'is', null)
        .order('applied_at', { ascending: false }),
    ])

    if (engineersErr || applicationsErr) {
      console.error('Overview query error:', engineersErr || applicationsErr)
      return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 })
    }
    if (matchesErr) console.warn('engineer_job_matches query failed:', matchesErr.message)

    // --- Engineers with funnel stage ---
    const engineerList = engineers || []
    const engineersWithMatches = new Set((matchedEngineerIds || []).map((m) => m.engineer_id))

    const appList = applications || []
    const engineersWhoApplied = new Set(
      appList.map((a) => {
        const eng = Array.isArray(a.engineer) ? a.engineer[0] : a.engineer
        return eng?.email
      }).filter(Boolean)
    )

    const stageOrder = ['Signed Up', 'Profile Crawled', 'Questionnaire Started', 'Questionnaire Completed', 'Got Matches', 'Applied'] as const
    type Stage = typeof stageOrder[number]

    function getStage(e: typeof engineerList[number]): Stage {
      if (engineersWhoApplied.has(e.email)) return 'Applied'
      if (engineersWithMatches.has(e.id)) return 'Got Matches'
      if (e.questionnaire_completed_at) return 'Questionnaire Completed'
      if (e.status === 'questionnaire' || e.status === 'complete') return 'Questionnaire Started'
      if (e.crawl_completed_at) return 'Profile Crawled'
      return 'Signed Up'
    }

    const engineerRows = engineerList
      .map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        status: e.status,
        stage: getStage(e),
        stageIndex: stageOrder.indexOf(getStage(e)),
        questionnaireCompletedAt: e.questionnaire_completed_at,
        createdAt: e.created_at,
      }))
      .sort((a, b) => b.stageIndex - a.stageIndex)

    // --- Application aggregation ---
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const engineerCounts: Record<string, { name: string; email: string; count: number; lastAppliedAt: string }> = {}
    let thisWeek = 0
    let thisMonth = 0

    for (const app of appList) {
      const engineer = Array.isArray(app.engineer) ? app.engineer[0] : app.engineer
      const email = engineer?.email || 'unknown'
      const name = engineer?.name || 'Unknown'
      const appliedAt = new Date(app.applied_at!)

      if (appliedAt >= startOfWeek) thisWeek++
      if (appliedAt >= startOfMonth) thisMonth++

      if (!engineerCounts[email]) {
        engineerCounts[email] = { name, email, count: 0, lastAppliedAt: app.applied_at! }
      }
      engineerCounts[email].count++
      if (app.applied_at! > engineerCounts[email].lastAppliedAt) {
        engineerCounts[email].lastAppliedAt = app.applied_at!
      }
    }

    const byEngineer = Object.values(engineerCounts).sort((a, b) => b.count - a.count)

    const list = appList.map((app) => {
      const engineer = Array.isArray(app.engineer) ? app.engineer[0] : app.engineer
      const job = Array.isArray(app.scanned_job) ? app.scanned_job[0] : app.scanned_job
      return {
        id: app.id,
        engineerName: engineer?.name || 'Unknown',
        engineerEmail: engineer?.email || '',
        companyName: job?.company_name || 'Unknown',
        jobTitle: job?.job_title || 'Unknown',
        location: job?.location || '',
        appliedAt: app.applied_at!,
        feedback: app.feedback || null,
      }
    })

    return NextResponse.json({
      engineers: engineerRows,
      applications: {
        total: appList.length,
        uniqueEngineers: engineersWhoApplied.size,
        thisWeek,
        thisMonth,
        byEngineer,
        list,
      },
    })
  })
}
