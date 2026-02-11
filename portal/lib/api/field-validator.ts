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
  'linkedin_url', 'portfolio_url', 'resume_url', 'cohort', 'is_available_for_cycles',
  'auth_user_id', 'status', 'crawl_data', 'crawl_error', 'crawl_completed_at',
  'engineer_dna', 'work_preferences', 'career_growth', 'strengths',
  'growth_areas', 'deal_breakers', 'profile_summary', 'priority_ratings',
  'questionnaire_completed_at', 'matching_preferences', 'preferred_locations',
] as const

export const COMPANY_FIELDS = [
  'name', 'company_name', 'company_linkedin', 'company_stage', 'newsletter_optin',
] as const

export const SUBMISSION_FIELDS = [
  'status', 'assigned_engineer_id', 'internal_notes',
  'sprint_start_date', 'sprint_end_date', 'hours_budget',
  'hours_logged', 'cancelled_reason',
] as const
