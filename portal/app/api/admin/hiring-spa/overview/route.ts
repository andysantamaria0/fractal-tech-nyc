import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const [
      { data: engineers, error: engineersErr },
      { data: matchedEngineerIds, error: matchesErr },
      { data: applications, error: applicationsErr },
      { data: allMatches, error: allMatchesErr },
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
      serviceClient
        .from('engineer_job_matches')
        .select('id, engineer_id, overall_score, feedback, feedback_category, applied_at, feedback_at, display_rank, created_at, engineer:engineers(name, email), scanned_job:scanned_jobs(company_name, job_title, location)')
        .order('created_at', { ascending: false }),
    ])

    if (engineersErr || applicationsErr) {
      console.error('Overview query error:', engineersErr || applicationsErr)
      return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 })
    }
    if (matchesErr) console.warn('engineer_job_matches query failed:', matchesErr.message)
    if (allMatchesErr) console.warn('all matches query failed:', allMatchesErr.message)

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
      if (e.status === 'questionnaire' || e.status === 'crawling') return 'Questionnaire Started'
      if (e.crawl_completed_at) return 'Profile Crawled'
      // status='complete' without questionnaire_completed_at is a data anomaly —
      // show as 'Questionnaire Started' so the admin knows follow-up is needed
      if (e.status === 'complete') return 'Questionnaire Started'
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

    // Cumulative funnel counts: how many engineers have reached *at least* each stage
    const funnelCounts: Record<string, number> = {}
    for (const e of engineerList) {
      const idx = stageOrder.indexOf(getStage(e))
      for (let i = 0; i <= idx; i++) {
        funnelCounts[stageOrder[i]] = (funnelCounts[stageOrder[i]] || 0) + 1
      }
    }

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

    // --- Match aggregation ---
    const matchList = allMatches || []
    const totalMatches = matchList.length
    let appliedCount = 0
    let notAFitCount = 0
    let pendingCount = 0
    let scoreSum = 0
    let appliedScoreSum = 0
    let appliedScoreCount = 0
    let dismissedScoreSum = 0
    let dismissedScoreCount = 0
    const dismissalMap: Record<string, number> = {}
    const engMatchMap: Record<string, { name: string; email: string; engineerId: string; total: number; applied: number; notAFit: number; pending: number; scoreSum: number }> = {}

    for (const m of matchList) {
      const eng = Array.isArray(m.engineer) ? m.engineer[0] : m.engineer
      const engName = eng?.name || 'Unknown'
      const engEmail = eng?.email || ''
      scoreSum += m.overall_score

      if (m.feedback === 'applied') {
        appliedCount++
        appliedScoreSum += m.overall_score
        appliedScoreCount++
      } else if (m.feedback === 'not_a_fit') {
        notAFitCount++
        dismissedScoreSum += m.overall_score
        dismissedScoreCount++
        const cat = m.feedback_category || 'other'
        dismissalMap[cat] = (dismissalMap[cat] || 0) + 1
      } else {
        pendingCount++
      }

      if (!engMatchMap[m.engineer_id]) {
        engMatchMap[m.engineer_id] = { name: engName, email: engEmail, engineerId: m.engineer_id, total: 0, applied: 0, notAFit: 0, pending: 0, scoreSum: 0 }
      }
      const em = engMatchMap[m.engineer_id]
      em.total++
      em.scoreSum += m.overall_score
      if (m.feedback === 'applied') em.applied++
      else if (m.feedback === 'not_a_fit') em.notAFit++
      else em.pending++
    }

    const dismissalReasons = Object.entries(dismissalMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    const matchesByEngineer = Object.values(engMatchMap)
      .map((em) => ({
        name: em.name,
        email: em.email,
        engineerId: em.engineerId,
        total: em.total,
        applied: em.applied,
        notAFit: em.notAFit,
        pending: em.pending,
        avgScore: Math.round(em.scoreSum / em.total),
      }))
      .sort((a, b) => b.total - a.total)

    const matchListMapped = matchList.map((m) => {
      const eng = Array.isArray(m.engineer) ? m.engineer[0] : m.engineer
      const job = Array.isArray(m.scanned_job) ? m.scanned_job[0] : m.scanned_job
      return {
        id: m.id,
        engineerName: eng?.name || 'Unknown',
        engineerEmail: eng?.email || '',
        companyName: job?.company_name || 'Unknown',
        jobTitle: job?.job_title || 'Unknown',
        location: job?.location || '',
        overallScore: m.overall_score,
        feedback: m.feedback || null,
        feedbackCategory: m.feedback_category || null,
        appliedAt: m.applied_at || null,
        createdAt: m.created_at,
      }
    })

    return NextResponse.json({
      engineers: engineerRows,
      funnelCounts,
      applicationCount: appList.length,
      applications: {
        total: appList.length,
        uniqueEngineers: engineersWhoApplied.size,
        thisWeek,
        thisMonth,
        byEngineer,
        list,
      },
      matches: {
        total: totalMatches,
        byStatus: { pending: pendingCount, applied: appliedCount, notAFit: notAFitCount },
        avgScore: totalMatches > 0 ? Math.round(scoreSum / totalMatches) : 0,
        avgScoreApplied: appliedScoreCount > 0 ? Math.round(appliedScoreSum / appliedScoreCount) : null,
        avgScoreDismissed: dismissedScoreCount > 0 ? Math.round(dismissedScoreSum / dismissedScoreCount) : null,
        dismissalReasons,
        byEngineer: matchesByEngineer,
        list: matchListMapped,
      },
    })
  })
}
