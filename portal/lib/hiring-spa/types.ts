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

export interface MatchWithEngineer extends HiringSpaMatch {
  engineer: EngineerProfileSpa
  feedback?: MatchFeedback
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
  status: EngineerProfileStatus
  created_at: string
  updated_at: string
}

// Hiring profile status
export type HiringProfileStatus = 'draft' | 'crawling' | 'questionnaire' | 'complete'

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
  status: HiringProfileStatus
  created_at: string
  updated_at: string
}
