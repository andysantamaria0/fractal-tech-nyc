import CyclesContent from '@/components/CyclesContent'
import MySubmissions from '@/components/MySubmissions'
import { demoEngineers } from '@/lib/constants'

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxx.supabase.co')

export default async function CyclesPage() {
  let engineers = demoEngineers
  let interestedIds: string[] = []

  if (isSupabaseConfigured) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data } = await supabase
      .from('engineers')
      .select('*')
      .eq('is_available_for_cycles', true)
      .order('created_at', { ascending: false })

    engineers = data ?? []

    // Fetch current user's interests
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: interests } = await supabase
        .from('engineer_interests')
        .select('engineer_id')
        .eq('user_id', user.id)

      interestedIds = (interests || []).map((i: { engineer_id: string }) => i.engineer_id)
    }
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
          <CyclesContent engineers={engineers} interestedIds={interestedIds} />
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

        <div style={{ marginTop: 'var(--space-7)' }}>
          <h2 className="section-title">My Submissions</h2>
          <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-7)' }}>
            Track the status of your feature requests.
          </p>
        </div>

        <MySubmissions />
      </div>
    </div>
  )
}
