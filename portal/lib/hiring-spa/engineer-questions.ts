import type { EngineerDNA } from './types'

export type EngineerSectionId =
  | 'work_preferences'
  | 'career_growth'
  | 'strengths'
  | 'growth_areas'
  | 'deal_breakers'

export interface EngineerQuestionDefinition {
  id: string
  question: string
  shortQuestion: string
  prefillFrom: string // dot-path into EngineerDNA
  section: EngineerSectionId
}

export const WORK_PREFERENCES_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'environment_type',
    question: 'What type of company environment do you thrive in? (Startup, growth-stage, enterprise, etc.)',
    shortQuestion: 'Preferred company environment:',
    prefillFrom: '',
    section: 'work_preferences',
  },
  {
    id: 'remote_preference',
    question: 'What is your preferred working arrangement? (Remote, hybrid, in-office)',
    shortQuestion: 'Working arrangement preference:',
    prefillFrom: '',
    section: 'work_preferences',
  },
  {
    id: 'ideal_team_dynamic',
    question: 'Describe your ideal team dynamic. How do you like to collaborate?',
    shortQuestion: 'Ideal team dynamic:',
    prefillFrom: '',
    section: 'work_preferences',
  },
  {
    id: 'management_style',
    question: 'What management style brings out your best work? (Hands-off, regular check-ins, pairing, etc.)',
    shortQuestion: 'Preferred management style:',
    prefillFrom: '',
    section: 'work_preferences',
  },
]

export const CAREER_GROWTH_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'whats_next',
    question: "What's the next step in your career? What role or type of work are you aiming for?",
    shortQuestion: 'Next career step:',
    prefillFrom: '',
    section: 'career_growth',
  },
  {
    id: 'growth_areas',
    question: 'What skills or areas do you most want to grow in?',
    shortQuestion: 'Growth areas:',
    prefillFrom: '',
    section: 'career_growth',
  },
  {
    id: 'exciting_problems',
    question: 'What types of technical problems excite you the most?',
    shortQuestion: 'Exciting problems:',
    prefillFrom: 'topSkills',
    section: 'career_growth',
  },
]

export const STRENGTHS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'genuinely_great_at',
    question: "What are you genuinely great at? What comes naturally to you that others find hard?",
    shortQuestion: 'Core strengths:',
    prefillFrom: 'topSkills',
    section: 'strengths',
  },
  {
    id: 'colleagues_come_to_you_for',
    question: 'What do colleagues typically come to you for help with?',
    shortQuestion: 'Known for helping with:',
    prefillFrom: '',
    section: 'strengths',
  },
]

export const GROWTH_AREAS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'actively_improving',
    question: "What are you actively working to improve? (Be honest — everyone has areas they're developing.)",
    shortQuestion: 'Actively improving:',
    prefillFrom: '',
    section: 'growth_areas',
  },
  {
    id: 'support_needed',
    question: 'What kind of support or environment helps you grow the fastest?',
    shortQuestion: 'Support for growth:',
    prefillFrom: '',
    section: 'growth_areas',
  },
]

export const DEAL_BREAKERS_QUESTIONS: EngineerQuestionDefinition[] = [
  {
    id: 'non_negotiables',
    question: 'What are your non-negotiables in a job? (Things that must be true for you to accept.)',
    shortQuestion: 'Non-negotiables:',
    prefillFrom: '',
    section: 'deal_breakers',
  },
  {
    id: 'would_make_you_leave',
    question: "What would make you leave a job? (What's happened at past roles that made you want out?)",
    shortQuestion: 'Would make you leave:',
    prefillFrom: '',
    section: 'deal_breakers',
  },
]

export const ALL_ENGINEER_QUESTIONS = [
  ...WORK_PREFERENCES_QUESTIONS,
  ...CAREER_GROWTH_QUESTIONS,
  ...STRENGTHS_QUESTIONS,
  ...GROWTH_AREAS_QUESTIONS,
  ...DEAL_BREAKERS_QUESTIONS,
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
    description: 'Help us understand what kind of environment you do your best work in.',
    questions: WORK_PREFERENCES_QUESTIONS,
    answersKey: 'work_preferences',
  },
  {
    id: 'career_growth',
    title: 'Career & Growth',
    description: 'Where you are headed and what excites you.',
    questions: CAREER_GROWTH_QUESTIONS,
    answersKey: 'career_growth',
  },
  {
    id: 'strengths',
    title: 'Strengths',
    description: 'What you bring to the table.',
    questions: STRENGTHS_QUESTIONS,
    answersKey: 'strengths',
  },
  {
    id: 'growth_areas',
    title: 'Growth Areas',
    description: 'Where you want to develop — honesty helps us find the right fit.',
    questions: GROWTH_AREAS_QUESTIONS,
    answersKey: 'growth_areas',
  },
  {
    id: 'deal_breakers',
    title: 'Deal Breakers',
    description: 'The things that matter most — and the red lines.',
    questions: DEAL_BREAKERS_QUESTIONS,
    answersKey: 'deal_breakers',
  },
]

/**
 * Resolve a prefill path against EngineerDNA.
 * Returns the value as a string, or empty string if not found.
 */
export function resolveEngineerPrefill(
  prefillFrom: string,
  engineerDna: EngineerDNA | null,
): string {
  if (!prefillFrom || !engineerDna) return ''

  const value = engineerDna[prefillFrom as keyof EngineerDNA]
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : ''
}
