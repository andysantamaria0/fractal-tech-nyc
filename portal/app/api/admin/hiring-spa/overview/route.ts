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

    // --- Funnel ---
    const engineerList = engineers || []
    const signedUp = engineerList.length
    const profileCrawled = engineerList.filter((e) => e.crawl_completed_at).length
    const questionnaireStarted = engineerList.filter(
      (e) => e.status === 'questionnaire' || e.status === 'complete'
    ).length
    const questionnaireCompleted = engineerList.filter((e) => e.questionnaire_completed_at).length

    const engineersWithMatches = new Set((matchedEngineerIds || []).map((m) => m.engineer_id))
    const gotMatches = engineerList.filter((e) => engineersWithMatches.has(e.id)).length

    const appList = applications || []
    const engineersWhoApplied = new Set(
      appList.map((a) => {
        const eng = Array.isArray(a.engineer) ? a.engineer[0] : a.engineer
        return eng?.email
      }).filter(Boolean)
    )
    const applied = engineersWhoApplied.size

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
      funnel: {
        signedUp,
        profileCrawled,
        questionnaireStarted,
        questionnaireCompleted,
        gotMatches,
        applied,
      },
      applications: {
        total: appList.length,
        uniqueEngineers: applied,
        thisWeek,
        thisMonth,
        byEngineer,
        list,
      },
    })
  })
}
