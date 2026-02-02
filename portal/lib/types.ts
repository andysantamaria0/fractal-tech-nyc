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
  cohort?: string
  is_available_for_cycles?: boolean
  created_at?: string
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
