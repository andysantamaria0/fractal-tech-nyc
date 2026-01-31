import CohortOverview from '@/components/CohortOverview'
import GitHubFeed from '@/components/GitHubFeed'
import SpotlightSection from '@/components/SpotlightSection'
import EngineerCard from '@/components/EngineerCard'
import DashboardTracker from '@/components/DashboardTracker'
import Link from 'next/link'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

// Demo data for dev mode
const demoEngineers = [
  {
    id: '1',
    name: 'Alex Chen',
    github_url: 'https://github.com/alexchen',
    github_username: 'alexchen',
    focus_areas: ['React', 'TypeScript', 'AI'],
    what_excites_you: 'Building full-stack AI apps that solve real problems for startups.',
    linkedin_url: 'https://linkedin.com/in/alexchen',
  },
  {
    id: '2',
    name: 'Jordan Rivera',
    github_url: 'https://github.com/jordanr',
    github_username: 'jordanr',
    focus_areas: ['Python', 'Data Pipelines', 'APIs'],
    what_excites_you: 'Designing robust backend systems and data infrastructure.',
  },
  {
    id: '3',
    name: 'Sam Patel',
    github_url: 'https://github.com/sampatel',
    github_username: 'sampatel',
    focus_areas: ['Next.js', 'Postgres', 'DevOps'],
    what_excites_you: 'Shipping product fast with modern web tooling.',
    portfolio_url: 'https://sampatel.dev',
  },
]

const demoSpotlights = [
  {
    id: '1',
    title: 'Cohort 4 Demo Day Highlights',
    content_type: 'text' as const,
    content_body: 'Engineers presented 12 production-grade projects to a panel of startup founders and CTOs. Standout projects included an AI-powered contract analyzer and a real-time collaborative code editor.',
  },
]

export default async function DashboardPage() {
  let cohort = null
  let currentWeek = 7
  let highlight = null
  let spotlights = demoSpotlights
  let engineers = demoEngineers

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Fetch cohort settings
    const { data: cohortData } = await supabase
      .from('cohort_settings')
      .select('*')
      .eq('is_active', true)
      .single()
    cohort = cohortData

    // Calculate current week (accounting for optional break week)
    currentWeek = 1
    if (cohort?.start_date) {
      const start = new Date(cohort.start_date)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const calendarWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
      // If a break week is set and we're past it, subtract 1 from the displayed week
      const breakWeek = cohort.break_week as number | null
      const adjustedWeek = breakWeek && calendarWeek > breakWeek
        ? calendarWeek - 1
        : calendarWeek
      currentWeek = Math.max(1, Math.min(adjustedWeek, cohort.duration_weeks || 12))
    }

    // Fetch current week highlight
    const { data: highlightData } = await supabase
      .from('weekly_highlights')
      .select('*')
      .eq('week_number', currentWeek)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    highlight = highlightData

    // Fetch spotlight content
    const { data: spotlightData } = await supabase
      .from('spotlight_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(3)
    spotlights = spotlightData ?? []

    // Fetch available engineers
    const { data: engineerData } = await supabase
      .from('engineers')
      .select('*')
      .eq('is_available_for_cycles', true)
      .order('created_at', { ascending: false })
      .limit(6)
    engineers = engineerData ?? []
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

        <GitHubFeed />

        <SpotlightSection items={spotlights ?? []} />

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
