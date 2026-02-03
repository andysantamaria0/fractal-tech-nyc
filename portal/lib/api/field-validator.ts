/**
 * Extract only allowed fields from a request body.
 * Returns a Record of field -> value for fields present in body.
 */
export function pickAllowedFields(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      result[field] = body[field]
    }
  }
  return result
}

// Centralized allowed field lists per resource
export const ENGINEER_FIELDS = [
  'name', 'email', 'photo_url', 'github_url', 'github_username',
  'focus_areas', 'what_excites_you', 'availability_start',
  'availability_hours_per_week', 'availability_duration_weeks',
  'linkedin_url', 'portfolio_url', 'cohort', 'is_available_for_cycles',
] as const

export const COMPANY_FIELDS = [
  'name', 'company_name', 'company_linkedin', 'company_stage', 'newsletter_optin',
  'has_hiring_spa_access', 'website_url', 'github_org',
] as const

export const SUBMISSION_FIELDS = [
  'status', 'assigned_engineer_id', 'internal_notes',
  'sprint_start_date', 'sprint_end_date', 'hours_budget',
  'hours_logged', 'cancelled_reason',
] as const
