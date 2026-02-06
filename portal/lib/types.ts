// Centralized type definitions for the portal app.
// Each component picks the subset it needs via Pick<> or the full interface.

export interface Engineer {
  id: string
  name: string
  email?: string
  photo_url?: string
  github_url?: string
  github_username?: string
  focus_areas?: string[]
  what_excites_you?: string
  availability_start?: string
  availability_hours_per_week?: number
  availability_duration_weeks?: number
  linkedin_url?: string
  portfolio_url?: string
  resume_url?: string
  cohort?: string
  is_available_for_cycles?: boolean
  // SPA / hiring portal fields
  auth_user_id?: string
  crawl_data?: unknown
  crawl_error?: string
  crawl_completed_at?: string
  engineer_dna?: unknown
  work_preferences?: unknown
  career_growth?: unknown
  strengths?: unknown
  growth_areas?: unknown
  deal_breakers?: unknown
  profile_summary?: unknown
  status?: string
  priority_ratings?: unknown
  questionnaire_completed_at?: string
  matching_preferences?: unknown
  preferred_locations?: string[]
  created_at?: string
  updated_at?: string
}

export interface Company {
  id: string
  name: string
  email: string
  company_name?: string
  company_linkedin?: string
  company_stage?: string
  newsletter_optin?: boolean
  hubspot_contact_id?: string
  hubspot_company_id?: string
  has_hiring_spa_access?: boolean
  website_url?: string
  github_org?: string
  created_at: string
}

export interface Submission {
  id: string
  title: string
  description?: string
  status: string
  timeline: string
  tech_stack?: string
  is_hiring: boolean
  hiring_types?: string[]
  created_at: string
  sprint_start_date?: string
  sprint_end_date?: string
  hours_budget?: number
  hours_logged?: number
  internal_notes?: string
  cancelled_reason?: string
  assigned_engineer_id?: string
  hubspot_note_id?: string
  profiles?: {
    name: string
    email: string
    company_linkedin: string
    hubspot_contact_id?: string
    hubspot_company_id?: string
  }
  assigned_engineer?: { id: string; name: string; email?: string } | null
  preferred_engineer?: { id: string; name: string } | null
}

export interface HistoryEntry {
  id: string
  field_name: string
  old_value?: string
  new_value?: string
  note?: string
  created_at: string
  profiles?: { name: string }
}
