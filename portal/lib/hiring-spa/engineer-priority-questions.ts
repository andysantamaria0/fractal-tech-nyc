export interface PriorityQuestion {
  id: string
  label: string
  description: string
  key: 'work_life_balance' | 'culture' | 'mission_driven' | 'technical_challenges'
}

export const PRIORITY_QUESTIONS: PriorityQuestion[] = [
  {
    id: 'work_life_balance',
    label: 'Work-Life Balance',
    description: 'Reasonable hours, sustainable pace, flexibility',
    key: 'work_life_balance',
  },
  {
    id: 'culture',
    label: 'Culture',
    description: 'Team dynamics, values alignment, inclusion',
    key: 'culture',
  },
  {
    id: 'mission_driven',
    label: 'Mission-Driven',
    description: 'Working on something meaningful, social impact',
    key: 'mission_driven',
  },
  {
    id: 'technical_challenges',
    label: 'Technical Challenges',
    description: 'Hard problems, cutting-edge tech, scale',
    key: 'technical_challenges',
  },
]

export type EngineerSectionId = 'work_preferences' | 'career_growth' | 'strengths' | 'growth_areas' | 'deal_breakers'

export interface EngineerQuestionDefinition {
  id: string
  question: string
  section: EngineerSectionId
}

export const ENGINEER_WORK_PREFERENCES_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'environment_type',
    question: 'What kind of work environment do you thrive in? (startup, mid-size, enterprise, etc.)',
    section: 'work_preferences',
  },
  {
    id: 'remote_preference',
    question: 'What\'s your preference for remote vs. in-office work?',
    section: 'work_preferences',
  },
  {
    id: 'ideal_team_dynamic',
    question: 'Describe your ideal team dynamic.',
    section: 'work_preferences',
  },
  {
    id: 'management_style',
    question: 'What management style brings out your best work?',
    section: 'work_preferences',
  },
]

export const ENGINEER_CAREER_GROWTH_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'whats_next',
    question: 'What are you looking for in your next role?',
    section: 'career_growth',
  },
  {
    id: 'growth_areas',
    question: 'What areas do you want to grow in?',
    section: 'career_growth',
  },
  {
    id: 'exciting_problems',
    question: 'What kinds of problems excite you most?',
    section: 'career_growth',
  },
]

export const ENGINEER_STRENGTHS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'genuinely_great_at',
    question: 'What are you genuinely great at?',
    section: 'strengths',
  },
  {
    id: 'colleagues_come_to_you_for',
    question: 'What do colleagues come to you for?',
    section: 'strengths',
  },
]

export const ENGINEER_GROWTH_AREAS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'actively_improving',
    question: 'What are you actively working to improve?',
    section: 'growth_areas',
  },
  {
    id: 'support_needed',
    question: 'What kind of support do you need to do your best work?',
    section: 'growth_areas',
  },
]

export const ENGINEER_DEAL_BREAKERS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'non_negotiables',
    question: 'What are your non-negotiables in a job?',
    section: 'deal_breakers',
  },
  {
    id: 'would_make_you_leave',
    question: 'What would make you leave a job?',
    section: 'deal_breakers',
  },
]

export const ALL_ENGINEER_QUESTIONS = [
  ...ENGINEER_WORK_PREFERENCES_QUESTIONS,
  ...ENGINEER_CAREER_GROWTH_QUESTIONS,
  ...ENGINEER_STRENGTHS_QUESTIONS,
  ...ENGINEER_GROWTH_AREAS_QUESTIONS,
  ...ENGINEER_DEAL_BREAKERS_QUESTIONS,
]

export interface EngineerSectionDefinition {
  id: EngineerSectionId
  title: string
  description: string
  questions: EngineerQuestionDefinition[]
  answersKey: 'work_preferences' | 'career_growth' | 'strengths' | 'growth_areas' | 'deal_breakers'
}

export const ENGINEER_SECTIONS: EngineerSectionDefinition[] = [
  {
    id: 'work_preferences',
    title: 'Work Preferences',
    description: 'What kind of environment and team brings out your best work.',
    questions: ENGINEER_WORK_PREFERENCES_QUESTIONS,
    answersKey: 'work_preferences',
  },
  {
    id: 'career_growth',
    title: 'Career Growth',
    description: 'Where you want to go next.',
    questions: ENGINEER_CAREER_GROWTH_QUESTIONS,
    answersKey: 'career_growth',
  },
  {
    id: 'strengths',
    title: 'Strengths',
    description: 'What you bring to a team.',
    questions: ENGINEER_STRENGTHS_QUESTIONS,
    answersKey: 'strengths',
  },
  {
    id: 'growth_areas',
    title: 'Growth Areas',
    description: 'Where you want to develop.',
    questions: ENGINEER_GROWTH_AREAS_QUESTIONS,
    answersKey: 'growth_areas',
  },
  {
    id: 'deal_breakers',
    title: 'Deal Breakers',
    description: 'What you won\'t compromise on.',
    questions: ENGINEER_DEAL_BREAKERS_QUESTIONS,
    answersKey: 'deal_breakers',
  },
]
