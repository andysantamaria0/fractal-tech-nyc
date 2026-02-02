import type React from 'react'

export const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-2)',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
}

export const COMPANY_STAGES = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'angel', label: 'Angel' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'bigger', label: 'Series A+' },
] as const

export const STATUS_OPTIONS = [
  'submitted', 'reviewing', 'posted', 'matched', 'in_progress', 'completed', 'cancelled',
] as const

export function getStatusColor(status: string): string {
  switch (status) {
    case 'submitted': return 'var(--color-slate)'
    case 'reviewing': return '#6B7280'
    case 'posted': return '#2563EB'
    case 'matched': return '#7C3AED'
    case 'in_progress': return '#D97706'
    case 'completed': return '#059669'
    case 'cancelled': return 'var(--color-error)'
    default: return 'var(--color-charcoal)'
  }
}

export const demoEngineers = [
  {
    id: '1',
    name: 'Alex Chen',
    github_url: 'https://github.com/alexchen',
    github_username: 'alexchen',
    focus_areas: ['React', 'TypeScript', 'AI'],
    what_excites_you: 'Building full-stack AI apps that solve real problems for startups.',
    linkedin_url: 'https://linkedin.com/in/alexchen',
  },
  {
    id: '2',
    name: 'Jordan Rivera',
    github_url: 'https://github.com/jordanr',
    github_username: 'jordanr',
    focus_areas: ['Python', 'Data Pipelines', 'APIs'],
    what_excites_you: 'Designing robust backend systems and data infrastructure.',
  },
  {
    id: '3',
    name: 'Sam Patel',
    github_url: 'https://github.com/sampatel',
    github_username: 'sampatel',
    focus_areas: ['Next.js', 'Postgres', 'DevOps'],
    what_excites_you: 'Shipping product fast with modern web tooling.',
    portfolio_url: 'https://sampatel.dev',
  },
  {
    id: '4',
    name: 'Morgan Lee',
    github_url: 'https://github.com/morganlee',
    github_username: 'morganlee',
    focus_areas: ['Mobile', 'React Native', 'GraphQL'],
    what_excites_you: 'Crafting seamless mobile experiences with native performance.',
    linkedin_url: 'https://linkedin.com/in/morganlee',
  },
]

export const demoSpotlights = [
  {
    id: '1',
    title: 'Cohort 4 Demo Day Highlights',
    content_type: 'text' as const,
    content_body: 'Engineers presented 12 production-grade projects to a panel of startup founders and CTOs. Standout projects included an AI-powered contract analyzer and a real-time collaborative code editor.',
  },
]
