'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Engineer {
  id: string
  name: string
  is_available_for_cycles: boolean
  availability_hours_per_week?: number
}

interface EngineerAssignmentProps {
  currentEngineerId?: string
  onAssign: (engineerId: string | null) => void
}

export default function EngineerAssignment({ currentEngineerId, onAssign }: EngineerAssignmentProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('engineers')
        .select('id, name, is_available_for_cycles, availability_hours_per_week')
        .order('name')

      setEngineers(data || [])
      setLoading(false)
    }
    load()
  }, [])

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
    </div>
  )
}
