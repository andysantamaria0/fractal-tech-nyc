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
