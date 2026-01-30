import EngineerCard from '@/components/EngineerCard'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

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
  {
    id: '4',
    name: 'Morgan Lee',
    github_url: 'https://github.com/morganlee',
    github_username: 'morganlee',
    focus_areas: ['Mobile', 'React Native', 'GraphQL'],
    what_excites_you: 'Crafting seamless mobile experiences with native performance.',
    linkedin_url: 'https://linkedin.com/in/morganlee',
  },
]

export default async function CyclesPage() {
  let engineers = demoEngineers

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data } = await supabase
      .from('engineers')
      .select('*')
      .eq('is_available_for_cycles', true)
      .order('created_at', { ascending: false })

    engineers = data ?? []
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Cycles</div>
          <h1 className="section-title">Available Engineers</h1>
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Browse engineers available for project cycles. Each engineer has been
            trained through the Fractal program and is ready to build.
          </p>
        </div>

        {engineers && engineers.length > 0 ? (
          <div className="engineers-grid">
            {engineers.map((engineer) => (
              <EngineerCard key={engineer.id} engineer={engineer} />
            ))}
          </div>
        ) : (
          <div className="window">
            <div className="window-title">No Engineers Available</div>
            <div className="window-content">
              <div className="loading-text">
                No engineers are currently available for cycles. Check back soon.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
