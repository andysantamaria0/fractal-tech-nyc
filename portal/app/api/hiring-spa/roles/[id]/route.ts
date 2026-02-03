import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { HiringRole, DimensionWeights, DimensionWeightsRaw, RoleStatus, JDFeedback } from '@/lib/hiring-spa/types'

const VALID_STATUSES: RoleStatus[] = ['draft', 'beautifying', 'active', 'paused', 'closed']

const VALID_TRANSITIONS: Record<RoleStatus, RoleStatus[]> = {
  draft: ['beautifying', 'closed'],
  beautifying: ['active', 'draft', 'closed'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: ['draft'],
}

const DIMENSION_KEYS: (keyof DimensionWeights)[] = [
  'mission', 'technical', 'culture', 'environment', 'dna'
]

function validateDimensionWeights(weights: DimensionWeights): string | null {
  for (const key of DIMENSION_KEYS) {
    if (typeof weights[key] !== 'number' || weights[key] < 0 || weights[key] > 100) {
      return `Invalid weight for ${key}: must be 0-100`
    }
  }

  const total = DIMENSION_KEYS.reduce((sum, k) => sum + weights[k], 0)
  if (total < 99 || total > 101) {
    return `Weights must sum to ~100, got ${total}`
  }

  return null
}

function validateDimensionWeightsRaw(weights: DimensionWeightsRaw): string | null {
  for (const key of DIMENSION_KEYS) {
    const val = weights[key]
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 10) {
      return `Invalid raw weight for ${key}: must be integer 1-10`
    }
  }
  return null
}

function validateJDFeedback(feedback: JDFeedback): string | null {
  if (typeof feedback !== 'object' || feedback === null) return 'Invalid feedback object'

  if (feedback.requirements && typeof feedback.requirements !== 'object') {
    return 'Invalid requirements feedback'
  }

  const proseSections = ['team_context', 'working_vibe', 'culture_check'] as const
  for (const section of proseSections) {
    if (feedback[section]) {
      const s = feedback[section]
      if (s.sentiment !== null && s.sentiment !== 'positive' && s.sentiment !== 'negative') {
        return `Invalid sentiment for ${section}`
      }
    }
  }

  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // RLS ensures company can only read their own roles
    const { data: role, error } = await supabase
      .from('hiring_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ role: role as HiringRole })
  } catch (error) {
    console.error('Hiring spa role get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { dimension_weights, dimension_weights_raw, status, challenge_enabled, challenge_prompt, title, jd_feedback } = body as {
      dimension_weights?: DimensionWeights
      dimension_weights_raw?: DimensionWeightsRaw
      status?: RoleStatus
      challenge_enabled?: boolean
      challenge_prompt?: string
      title?: string
      jd_feedback?: JDFeedback
    }

    // Fetch current role for validation
    const { data: currentRole, error: fetchError } = await supabase
      .from('hiring_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Build update object
    const update: Record<string, unknown> = {}

    if (dimension_weights) {
      const weightError = validateDimensionWeights(dimension_weights)
      if (weightError) {
        return NextResponse.json({ error: weightError }, { status: 400 })
      }
      update.dimension_weights = dimension_weights
    }

    if (dimension_weights_raw) {
      const rawError = validateDimensionWeightsRaw(dimension_weights_raw)
      if (rawError) {
        return NextResponse.json({ error: rawError }, { status: 400 })
      }
      update.dimension_weights_raw = dimension_weights_raw
    }

    if (jd_feedback !== undefined) {
      if (jd_feedback === null) {
        update.jd_feedback = null
      } else {
        const feedbackError = validateJDFeedback(jd_feedback)
        if (feedbackError) {
          return NextResponse.json({ error: feedbackError }, { status: 400 })
        }
        update.jd_feedback = jd_feedback
      }
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
      }
      const currentStatus = currentRole.status as RoleStatus
      if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${status}` },
          { status: 400 }
        )
      }
      update.status = status
    }

    if (typeof challenge_enabled === 'boolean') {
      update.challenge_enabled = challenge_enabled
    }

    if (challenge_prompt !== undefined) {
      update.challenge_prompt = challenge_prompt
    }

    if (title) {
      update.title = title
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: role, error } = await supabase
      .from('hiring_roles')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ role: role as HiringRole })
  } catch (error) {
    console.error('Hiring spa role update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
