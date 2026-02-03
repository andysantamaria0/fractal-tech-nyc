'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { DimensionWeights, DimensionWeightsRaw } from '@/lib/hiring-spa/types'

const DIMENSIONS: { key: keyof DimensionWeightsRaw; label: string }[] = [
  { key: 'mission', label: 'Mission Alignment' },
  { key: 'technical', label: 'Technical Fit' },
  { key: 'culture', label: 'Culture Fit' },
  { key: 'environment', label: 'Environment Fit' },
  { key: 'dna', label: 'DNA Match' },
]

const DEFAULT_RAW: DimensionWeightsRaw = {
  mission: 5,
  technical: 5,
  culture: 5,
  environment: 5,
  dna: 5,
}

function normalizeToPercentages(raw: DimensionWeightsRaw): DimensionWeights {
  const sum = DIMENSIONS.reduce((s, d) => s + raw[d.key], 0)
  const result: Record<string, number> = {}
  let remaining = 100

  for (let i = 0; i < DIMENSIONS.length; i++) {
    if (i === DIMENSIONS.length - 1) {
      result[DIMENSIONS[i].key] = remaining
    } else {
      const pct = Math.round((raw[DIMENSIONS[i].key] / sum) * 100)
      result[DIMENSIONS[i].key] = pct
      remaining -= pct
    }
  }

  return result as unknown as DimensionWeights
}

function generateSummary(raw: DimensionWeightsRaw): string {
  const high: string[] = []
  const moderate: string[] = []
  const low: string[] = []

  const labels: Record<keyof DimensionWeightsRaw, string> = {
    mission: 'mission alignment',
    technical: 'technical fit',
    culture: 'culture fit',
    environment: 'environment fit',
    dna: 'DNA match',
  }

  for (const d of DIMENSIONS) {
    const val = raw[d.key]
    if (val >= 8) high.push(labels[d.key])
    else if (val >= 4) moderate.push(labels[d.key])
    else low.push(labels[d.key])
  }

  const parts: string[] = []

  if (high.length > 0) {
    parts.push(`You're prioritizing ${formatList(high)} heavily`)
  }
  if (moderate.length > 0) {
    parts.push(`${high.length > 0 ? 'with ' : ''}${formatList(moderate)} as ${moderate.length === 1 ? 'a moderate factor' : 'moderate factors'}`)
  }
  if (low.length > 0) {
    parts.push(`${parts.length > 0 ? 'and ' : ''}${formatList(low)} ${low.length === 1 ? 'matters' : 'matter'} less`)
  }

  if (parts.length === 0) {
    return 'All dimensions are weighted evenly.'
  }

  // If everything is moderate
  if (high.length === 0 && low.length === 0) {
    return 'All dimensions are weighted about evenly.'
  }

  return parts.join(', ') + '.'
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
}

interface Props {
  weightsRaw: DimensionWeightsRaw | null
  onSave: (normalized: DimensionWeights, raw: DimensionWeightsRaw) => Promise<void>
}

export default function DimensionWeightSliders({ weightsRaw, onSave }: Props) {
  const [local, setLocal] = useState<DimensionWeightsRaw>(weightsRaw ?? DEFAULT_RAW)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestLocal = useRef(local)
  latestLocal.current = local

  const handleChange = useCallback((key: keyof DimensionWeightsRaw, value: number) => {
    setLocal(prev => ({ ...prev, [key]: value }))
    setSaveStatus('idle')
  }, [])

  // Auto-save with 1200ms debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      const raw = latestLocal.current
      const normalized = normalizeToPercentages(raw)
      setSaveStatus('saving')
      try {
        await onSave(normalized, raw)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000)
      } catch {
        setSaveStatus('idle')
      }
    }, 1200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [local, onSave])

  const summary = generateSummary(local)

  return (
    <div>
      <div className="spa-sliders">
        {DIMENSIONS.map(d => (
          <div key={d.key} className="spa-slider-row">
            <span className="spa-slider-label">{d.label}</span>
            <span className="spa-slider-endcap">Less</span>
            <input
              type="range"
              className="spa-slider-input"
              min={1}
              max={10}
              step={1}
              value={local[d.key]}
              onChange={e => handleChange(d.key, parseInt(e.target.value, 10))}
            />
            <span className="spa-slider-endcap">More</span>
          </div>
        ))}
      </div>

      <div className="spa-slider-summary">
        {summary}
      </div>

      {saveStatus !== 'idle' && (
        <div className="spa-slider-status">
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </div>
      )}
    </div>
  )
}
