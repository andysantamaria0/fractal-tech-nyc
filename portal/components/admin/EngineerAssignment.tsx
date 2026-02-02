'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
type EngineerSummary = Pick<
  import('@/lib/types').Engineer,
  'id' | 'name' | 'is_available_for_cycles' | 'availability_hours_per_week' | 'focus_areas'
>

interface ActiveSprint {
  id: string
  title: string
  status: string
  sprint_start_date?: string
  hours_logged?: number
  hours_budget?: number
}

interface EngineerAssignmentProps {
  currentEngineerId?: string
  onAssign: (engineerId: string | null) => void
}

export default function EngineerAssignment({ currentEngineerId, onAssign }: EngineerAssignmentProps) {
  const [engineers, setEngineers] = useState<EngineerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSprints, setActiveSprints] = useState<ActiveSprint[]>([])
  const [sprintsLoading, setSprintsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('engineers')
        .select('id, name, is_available_for_cycles, availability_hours_per_week, focus_areas')
        .order('name')

      setEngineers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!currentEngineerId) {
      setActiveSprints([])
      return
    }
    loadActiveSprints(currentEngineerId)
  }, [currentEngineerId])

  async function loadActiveSprints(engineerId: string) {
    setSprintsLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('feature_submissions')
        .select('id, title, status, sprint_start_date, hours_logged, hours_budget')
        .eq('assigned_engineer_id', engineerId)
        .in('status', ['matched', 'in_progress'])
        .order('created_at', { ascending: false })

      setActiveSprints(data || [])
    } catch {
      setActiveSprints([])
    } finally {
      setSprintsLoading(false)
    }
  }

  const selectedEngineer = engineers.find((e) => e.id === currentEngineerId)

  function sprintDay(startDate?: string): number | null {
    if (!startDate) return null
    const start = new Date(startDate)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  }

  if (loading) {
    return <div className="loading-text">Loading engineers...</div>
  }

  return (
    <div>
      <label htmlFor="engineer-assign" style={{ display: 'block', marginBottom: 'var(--space-3)', fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Assign Engineer
      </label>
      <select
        id="engineer-assign"
        className="form-select"
        value={currentEngineerId || ''}
        onChange={(e) => onAssign(e.target.value || null)}
      >
        <option value="">Unassigned</option>
        {engineers.map((eng) => (
          <option key={eng.id} value={eng.id}>
            {eng.name} {eng.is_available_for_cycles ? '' : '(unavailable)'} {eng.availability_hours_per_week ? `— ${eng.availability_hours_per_week}h/wk` : ''}
          </option>
        ))}
      </select>

      {selectedEngineer && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', border: '1px solid var(--color-border, #e2e2e2)', borderRadius: 2 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Engineer Info
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: selectedEngineer.is_available_for_cycles ? 'var(--color-ink)' : 'var(--color-slate)' }}>
              {selectedEngineer.is_available_for_cycles ? 'Available' : 'Unavailable'}
            </span>
            {selectedEngineer.availability_hours_per_week && (
              <span>{selectedEngineer.availability_hours_per_week}h/wk</span>
            )}
          </div>
          {selectedEngineer.focus_areas && selectedEngineer.focus_areas.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {selectedEngineer.focus_areas.map((area) => (
                <span key={area} className="admin-flag" style={{ borderColor: 'var(--color-slate)', color: 'var(--color-slate)' }}>
                  {area}
                </span>
              ))}
            </div>
          )}

          {sprintsLoading ? (
            <div className="loading-text" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>Loading sprints...</div>
          ) : activeSprints.length > 0 ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-slate)', marginBottom: 'var(--space-2)' }}>
                Active Sprints ({activeSprints.length})
              </div>
              {activeSprints.map((sprint) => {
                const day = sprintDay(sprint.sprint_start_date)
                const overdue = day !== null && day > 10
                return (
                  <div key={sprint.id} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0', borderTop: '1px solid var(--color-border, #e2e2e2)' }}>
                    <div style={{ fontWeight: 700 }}>{sprint.title}</div>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--color-slate)', marginTop: 'var(--space-1)' }}>
                      <span>{sprint.status.replace(/_/g, ' ')}</span>
                      {day !== null && (
                        <span style={{ color: overdue ? 'var(--color-red, #c00)' : undefined }}>
                          Day {day}{overdue ? ' (overdue)' : ''}
                        </span>
                      )}
                      {(sprint.hours_logged !== null || sprint.hours_budget !== null) && (
                        <span>{sprint.hours_logged ?? 0}h / {sprint.hours_budget ?? 30}h</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-slate)' }}>
              No active sprints
            </div>
          )}
        </div>
      )}
    </div>
  )
}
