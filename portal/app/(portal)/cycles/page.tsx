import EngineerCard from '@/components/EngineerCard'
import { demoEngineers } from '@/lib/constants'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

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
