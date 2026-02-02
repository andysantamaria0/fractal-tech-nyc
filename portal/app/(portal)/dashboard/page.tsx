import CohortOverview from '@/components/CohortOverview'
import GitHubFeed from '@/components/GitHubFeed'
import SpotlightSection from '@/components/SpotlightSection'
import EngineerCard from '@/components/EngineerCard'
import DashboardTracker from '@/components/DashboardTracker'
import Link from 'next/link'
import { demoEngineers, demoSpotlights } from '@/lib/constants'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export default async function DashboardPage() {
  let cohort = null
  let currentWeek = 7
  let highlight = null
  let spotlights = demoSpotlights
  let engineers = demoEngineers

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Run independent queries in parallel
    const [cohortResult, spotlightResult, engineerResult] = await Promise.all([
      supabase.from('cohort_settings').select('*').eq('is_active', true).single(),
      supabase.from('spotlight_content').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(3),
      supabase.from('engineers').select('*').eq('is_available_for_cycles', true).order('created_at', { ascending: false }).limit(6),
    ])

    cohort = cohortResult.data
    spotlights = spotlightResult.data ?? []
    engineers = engineerResult.data ?? []

    // Calculate current week (accounting for optional break week)
    currentWeek = 1
    if (cohort?.start_date) {
      const start = new Date(cohort.start_date)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const calendarWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
      const breakWeek = cohort.break_week as number | null
      const adjustedWeek = breakWeek && calendarWeek > breakWeek
        ? calendarWeek - 1
        : calendarWeek
      currentWeek = Math.max(1, Math.min(adjustedWeek, cohort.duration_weeks || 12))
    }

    // Highlight depends on currentWeek (derived from cohort), so must run after
    const { data: highlightData } = await supabase
      .from('weekly_highlights')
      .select('*')
      .eq('week_number', currentWeek)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    highlight = highlightData
  }

  return (
    <div className="dashboard">
      <DashboardTracker />
      <div className="dashboard-grid">
        <CohortOverview
          numEngineers={cohort?.num_engineers ?? 15}
          currentWeek={currentWeek}
          totalWeeks={cohort?.duration_weeks ?? 12}
          weekTitle={highlight?.title ?? 'Building full-stack AI apps'}
          weekDescription={highlight?.description ?? undefined}
        />

        <SpotlightSection items={spotlights ?? []} />

        <GitHubFeed />

        <div className="window">
          <div className="window-title">Available Engineers</div>
          <div className="window-content">
            {engineers && engineers.length > 0 ? (
              <>
                <div className="engineers-grid">
                  {engineers.map((engineer) => (
                    <EngineerCard key={engineer.id} engineer={engineer} />
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                  <Link href="/cycles" className="btn-secondary">
                    View All Engineers
                  </Link>
                </div>
              </>
            ) : (
              <div className="loading-text">
                No engineers available for cycles right now. Check back soon.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
