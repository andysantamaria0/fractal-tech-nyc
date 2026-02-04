// Crawl data types

export interface CrawledPage {
  url: string
  title: string
  content: string
  crawledAt: string
}

export interface CrawlData {
  website: CrawledPage[]
  github?: GitHubOrgData
  linkedinUrl?: string // known but not crawled
}

export interface GitHubOrgData {
  name: string
  description: string | null
  publicRepos: number
  repos: GitHubRepoSummary[]
  languages: Record<string, number> // language -> repo count
}

export interface GitHubRepoSummary {
  name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  updatedAt: string
  topics: string[]
}

// Synthesis output types

export interface CompanyDNA {
  mission: string
  values: string[]
  culture: string
  workStyle: string
  fundingStage: string | null
  teamSize: string | null
  industry: string
}

export interface TechnicalEnvironment {
  primaryLanguages: string[]
  frameworks: string[]
  infrastructure: string[]
  devPractices: string[]
  openSourceInvolvement: string
}

export interface CrawlHighlight {
  excerpt: string
  source: string
  topic: 'mission' | 'culture' | 'values' | 'tech' | 'team' | 'hiring' | 'product'
}

export interface SynthesisOutput {
  companyDna: CompanyDNA
  technicalEnvironment: TechnicalEnvironment
  crawlHighlights: CrawlHighlight[]
  confidence: number // 0-1 how confident the synthesis is
}

// Questionnaire answer types

export interface CultureAnswers {
  successful_employees?: string
  why_employees_stay?: string
  best_people_attributes?: string
  honest_working_style?: string
  what_doesnt_work?: string
}

export interface MissionAnswers {
  actual_mission?: string
  revealing_tradeoffs?: string
}

export interface TeamDynamicsAnswers {
  daily_communication?: string
  decision_making_style?: string
  conflict_handling?: string
}

// Contradiction detected between crawl data and user answers

export interface Contradiction {
  signal: string
  answer_excerpt: string
  question_id: string
  suggestion: string
  source: string
  resolved?: boolean
}

// Generated profile summary

export interface ProfileSummary {
  companySnapshot: string
  cultureSignature: string[]
  workingEnvironment: string
  whatGreatLooksLike: string
  whatDoesntWork: string
  technicalSummary: string
}

// Role types

export type RoleStatus = 'draft' | 'beautifying' | 'active' | 'paused' | 'closed'

export interface BeautifiedRequirement {
  text: string
  category: 'essential' | 'nice_to_have'
  caveat?: string // e.g. "we'd teach the right person" or "only matters at senior level"
}

export interface BeautifiedJD {
  requirements: BeautifiedRequirement[]
  team_context: string // what team they'd join, what the team does
  working_vibe: string // day-to-day feel, pace, autonomy level
  culture_check: string // honest "you'll thrive here if..." / "you won't enjoy this if..."
}

export interface DimensionWeights {
  mission: number
  technical: number
  culture: number
  environment: number
  dna: number
}

export interface DimensionWeightsRaw {
  mission: number
  technical: number
  culture: number
  environment: number
  dna: number
}

// Match types

export type MatchDecision = 'moved_forward' | 'passed'

export type ChallengeStatus = 'not_sent' | 'sent' | 'submitted' | 'reviewed'

export interface MatchReasoning {
  mission: string
  technical: string
  culture: string
  environment: string
  dna: string
}

export interface HiringSpaMatch {
  id: string
  role_id: string
  engineer_id: string
  overall_score: number
  dimension_scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string | null
  display_rank: number
  decision: MatchDecision | null
  decision_at: string | null
  challenge_response: 'accepted' | 'declined' | null
  challenge_response_at: string | null
  engineer_notified_at: string | null
  engineer_decision: 'interested' | 'not_interested' | null
  engineer_decision_at: string | null
  created_at: string
  updated_at: string
}

export interface MatchFeedback {
  id: string
  match_id: string
  hired: boolean
  rating: number | null
  worked_well: string | null
  didnt_work: string | null
  would_use_again: boolean | null
  created_at: string
  updated_at: string
}

export interface ChallengeSubmission {
  id: string
  match_id: string
  text_response: string | null
  link_url: string | null
  file_url: string | null
  file_name: string | null
  auto_score: number | null
  auto_reasoning: string | null
  auto_graded_at: string | null
  reviewer_name: string | null
  reviewer_linkedin_url: string | null
  human_score: number | null
  human_feedback: string | null
  reviewed_at: string | null
  final_score: number | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface MatchWithEngineer extends HiringSpaMatch {
  engineer: EngineerProfileSpa
  feedback?: MatchFeedback
  challenge_submission?: ChallengeSubmission
}

// JD feedback types

export interface RequirementFeedback {
  status: 'confirmed' | 'rejected' | null
  note?: string
}

export interface ProseSectionFeedback {
  sentiment: 'positive' | 'negative' | null
  note?: string
}

export interface JDFeedback {
  requirements: Record<number, RequirementFeedback>
  team_context: ProseSectionFeedback
  working_vibe: ProseSectionFeedback
  culture_check: ProseSectionFeedback
}

export interface HiringRole {
  id: string
  hiring_profile_id: string
  source_url: string | null
  source_content: string | null
  title: string
  beautified_jd: BeautifiedJD | null
  dimension_weights: DimensionWeights
  dimension_weights_raw: DimensionWeightsRaw | null
  jd_feedback: JDFeedback | null
  challenge_enabled: boolean
  challenge_prompt: string | null
  status: RoleStatus
  public_slug: string
  ats_provider?: string | null
  ats_external_id?: string | null
  ats_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface JDPageView {
  id: string
  role_id: string
  viewer_email: string
  viewed_at: string
}

export interface ExtractedJD {
  title: string
  sections: { heading: string; content: string }[]
  raw_text: string
  source_platform?: string
}

// Engineer profile types

export type EngineerProfileStatus = 'draft' | 'crawling' | 'questionnaire' | 'complete'

export interface EngineerCrawlData {
  github?: GitHubOrgData
  linkedinUrl?: string
  portfolioPages?: CrawledPage[]
}

export interface EngineerDNA {
  topSkills: string[]
  languages: string[]
  frameworks: string[]
  yearsOfExperience: string | null
  senioritySignal: string
  projectHighlights: string[]
  publicWriting: string | null
}

export interface WorkPreferencesAnswers {
  environment_type?: string
  remote_preference?: string
  ideal_team_dynamic?: string
  management_style?: string
}

export interface CareerGrowthAnswers {
  whats_next?: string
  growth_areas?: string
  exciting_problems?: string
}

export interface StrengthsAnswers {
  genuinely_great_at?: string
  colleagues_come_to_you_for?: string
}

export interface GrowthAreasAnswers {
  actively_improving?: string
  support_needed?: string
}

export interface DealBreakersAnswers {
  non_negotiables?: string
  would_make_you_leave?: string
}

export interface EngineerProfileSummary {
  snapshot: string
  technicalIdentity: string
  workStyle: string
  growthTrajectory: string
  bestFitSignals: string[]
  dealBreakers: string[]
}

export interface EngineerProfileSpa {
  id: string
  engineer_id: string | null
  auth_user_id: string | null
  name: string
  email: string
  linkedin_url: string | null
  resume_url: string | null
  github_url: string | null
  portfolio_url: string | null
  crawl_data: EngineerCrawlData | null
  crawl_error: string | null
  crawl_completed_at: string | null
  engineer_dna: EngineerDNA | null
  work_preferences: WorkPreferencesAnswers | null
  career_growth: CareerGrowthAnswers | null
  strengths: StrengthsAnswers | null
  growth_areas: GrowthAreasAnswers | null
  deal_breakers: DealBreakersAnswers | null
  profile_summary: EngineerProfileSummary | null
  matching_preferences: MatchingPreferences | null
  priority_ratings: PriorityRatings | null
  status: EngineerProfileStatus
  created_at: string
  updated_at: string
}

// Priority ratings for engineer job matching
export interface PriorityRatings {
  work_life_balance: number // 1-5
  culture: number // 1-5
  mission_driven: number // 1-5
  technical_challenges: number // 1-5
}

// Scanned jobs from job-jr

export interface ScannedJob {
  id: string
  company_name: string
  company_domain: string
  job_title: string
  job_url: string
  job_board_source: string | null
  location: string | null
  date_posted: string | null
  description: string | null
  hubspot_link: string | null
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
}

// Engineer job feedback types

export type EngineerJobFeedback = 'not_a_fit' | 'applied'

export type FeedbackCategory = 'wrong_location' | 'wrong_tech_stack' | 'company_not_interesting' | 'role_seniority' | 'other'

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'wrong_location', label: 'Wrong Location' },
  { value: 'wrong_tech_stack', label: 'Wrong Tech Stack' },
  { value: 'company_not_interesting', label: 'Company Not Interesting' },
  { value: 'role_seniority', label: 'Role / Seniority Mismatch' },
  { value: 'other', label: 'Other' },
]

export interface MatchingPreferences {
  excluded_locations: string[]
  excluded_companies: string[]
  excluded_company_domains: string[]
  excluded_keywords: string[]
}

export interface EngineerJobMatch {
  id: string
  engineer_profile_id: string
  scanned_job_id: string
  overall_score: number
  dimension_scores: DimensionWeights
  reasoning: MatchReasoning
  highlight_quote: string | null
  display_rank: number | null
  feedback: EngineerJobFeedback | null
  feedback_reason: string | null
  feedback_category: FeedbackCategory | null
  feedback_at: string | null
  applied_at: string | null
  batch_id: string | null
  created_at: string
  updated_at: string
}

export interface EngineerJobMatchWithJob extends EngineerJobMatch {
  scanned_job: ScannedJob
}

// ATS types

export type ATSProvider = 'greenhouse'

export interface ATSConnection {
  id: string
  company_id: string
  provider: ATSProvider
  last_sync_at: string | null
  last_sync_error: string | null
  last_sync_role_count: number | null
  created_at: string
  updated_at: string
}

export interface GreenhouseJob {
  id: number
  name: string
  status: string
  departments: { id: number; name: string }[]
  offices: { id: number; name: string }[]
  updated_at: string
}

export interface GreenhouseJobPost {
  id: number
  title: string
  content: string
  active: boolean
  job_id: number
}

// Discovered role from auto-crawl
export interface DiscoveredRole {
  url: string
  title: string
  raw_text: string
  source_platform: string
  confidence: number
}

// Hiring profile status
export type HiringProfileStatus = 'draft' | 'crawling' | 'discovering_roles' | 'questionnaire' | 'complete'

export interface HiringProfile {
  id: string
  company_id: string
  crawl_data: CrawlData | null
  crawl_error: string | null
  crawl_completed_at: string | null
  company_dna: CompanyDNA | null
  technical_environment: TechnicalEnvironment | null
  contradictions: Contradiction[] | null
  culture_answers: CultureAnswers | null
  mission_answers: MissionAnswers | null
  team_dynamics_answers: TeamDynamicsAnswers | null
  profile_summary: ProfileSummary | null
  questionnaire_drafts: Record<string, string> | null
  discovered_roles: DiscoveredRole[] | null
  status: HiringProfileStatus
  created_at: string
  updated_at: string
}
