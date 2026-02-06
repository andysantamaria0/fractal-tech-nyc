import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'

export async function GET() {
  return withAdmin(async ({ serviceClient }) => {
    const { data: applications, error: applicationsErr } = await serviceClient
      .from('engineer_job_matches')
      .select('id, applied_at, feedback, engineer:engineers(name, email), scanned_job:scanned_jobs(company_name, job_title, location)')
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })

    if (applicationsErr) {
      console.error('Applications query error:', applicationsErr)
      return NextResponse.json({ error: 'Failed to fetch applications data' }, { status: 500 })
    }

    const appList = applications || []

    // Aggregate stats
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const uniqueEngineers = new Set<string>()
    const engineerCounts: Record<string, { name: string; email: string; count: number; lastAppliedAt: string }> = {}
    let thisWeek = 0
    let thisMonth = 0

    for (const app of appList) {
      const engineer = Array.isArray(app.engineer) ? app.engineer[0] : app.engineer
      const email = engineer?.email || 'unknown'
      const name = engineer?.name || 'Unknown'
      const appliedAt = new Date(app.applied_at!)

      uniqueEngineers.add(email)

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
      applications: {
        total: appList.length,
        uniqueEngineers: uniqueEngineers.size,
        thisWeek,
        thisMonth,
        byEngineer,
        list,
      },
    })
  })
}
