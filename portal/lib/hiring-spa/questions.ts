export type SectionId = 'culture' | 'mission' | 'team_dynamics' | 'technical'

export interface QuestionDefinition {
  id: string
  question: string
  shortQuestion: string // used when drafts are pre-filled
  section: SectionId
}

export const CULTURE_QUESTIONS: QuestionDefinition[] = [
  {
    id: 'successful_employees',
    question: 'What do your most successful employees have in common?',
    shortQuestion: 'Confirm or refine what makes employees successful here:',
    section: 'culture',
  },
  {
    id: 'why_employees_stay',
    question: 'What do employees who love working here say about why they stay?',
    shortQuestion: 'Confirm or refine why employees stay:',
    section: 'culture',
  },
  {
    id: 'best_people_attributes',
    question: 'What attributes are notable and common among your best people?',
    shortQuestion: 'Confirm or refine key attributes of your best people:',
    section: 'culture',
  },
  {
    id: 'honest_working_style',
    question: "What's the honest working style? (Remote, hybrid, hours, pace, etc.)",
    shortQuestion: 'Confirm or refine your working style:',
    section: 'culture',
  },
  {
    id: 'what_doesnt_work',
    question: "What doesn't work here? What kind of person would struggle?",
    shortQuestion: 'Confirm or refine what doesn\'t work here:',
    section: 'culture',
  },
]

export const MISSION_QUESTIONS: QuestionDefinition[] = [
  {
    id: 'actual_mission',
    question: 'What is the company actually trying to accomplish?',
    shortQuestion: 'Confirm or refine your mission:',
    section: 'mission',
  },
  {
    id: 'revealing_tradeoffs',
    question: 'What trade-offs has the company made that reveal what it values most?',
    shortQuestion: 'Confirm or refine revealing trade-offs:',
    section: 'mission',
  },
]

export const TEAM_DYNAMICS_QUESTIONS: QuestionDefinition[] = [
  {
    id: 'daily_communication',
    question: 'How do teams communicate day-to-day? (Slack-heavy, meetings, async, etc.)',
    shortQuestion: 'Confirm or refine communication style:',
    section: 'team_dynamics',
  },
  {
    id: 'decision_making_style',
    question: 'How are technical and product decisions made? (Top-down, consensus, tech leads, etc.)',
    shortQuestion: 'Confirm or refine decision-making style:',
    section: 'team_dynamics',
  },
  {
    id: 'conflict_handling',
    question: 'How is disagreement or conflict handled on the team?',
    shortQuestion: 'Confirm or refine conflict handling:',
    section: 'team_dynamics',
  },
]

export const ALL_QUESTIONS = [
  ...CULTURE_QUESTIONS,
  ...MISSION_QUESTIONS,
  ...TEAM_DYNAMICS_QUESTIONS,
]

export interface SectionDefinition {
  id: SectionId
  title: string
  description: string
  questions: QuestionDefinition[]
  answersKey: 'culture_answers' | 'mission_answers' | 'team_dynamics_answers' | 'technical_environment'
}

export const SECTIONS: SectionDefinition[] = [
  {
    id: 'culture',
    title: 'Culture & DNA',
    description: 'Help us understand what makes your company tick.',
    questions: CULTURE_QUESTIONS,
    answersKey: 'culture_answers',
  },
  {
    id: 'mission',
    title: 'Mission & Values',
    description: 'What drives the company forward.',
    questions: MISSION_QUESTIONS,
    answersKey: 'mission_answers',
  },
  {
    id: 'team_dynamics',
    title: 'Team Dynamics',
    description: 'How your team works together day-to-day.',
    questions: TEAM_DYNAMICS_QUESTIONS,
    answersKey: 'team_dynamics_answers',
  },
  {
    id: 'technical',
    title: 'Technical Environment',
    description: 'Your tech stack and engineering practices — pre-populated from your web presence.',
    questions: [],
    answersKey: 'technical_environment',
  },
]

