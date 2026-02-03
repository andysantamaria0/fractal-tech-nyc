/**
 * PostHog Dashboard Setup Script
 *
 * Creates 3 dashboards for tracking company partner acquisition, engagement, and retention.
 *
 * Usage:
 *   npx tsx portal/scripts/setup-posthog-dashboards.ts
 *
 * Environment variables (will prompt if not set):
 *   POSTHOG_PERSONAL_API_KEY - Your PostHog personal API key
 *   POSTHOG_PROJECT_ID       - Your PostHog project ID
 */

import * as readline from 'readline'

const POSTHOG_API_BASE = 'https://us.posthog.com'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function getConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || await prompt('PostHog Personal API Key: ')
  const projectId = process.env.POSTHOG_PROJECT_ID || await prompt('PostHog Project ID: ')

  if (!apiKey || !projectId) {
    console.error('Both API key and project ID are required.')
    process.exit(1)
  }

  return { apiKey, projectId }
}

async function posthogApi(
  method: string,
  path: string,
  apiKey: string,
  body?: Record<string, unknown>,
) {
  const url = `${POSTHOG_API_BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostHog API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json()
}

interface InsightDefinition {
  name: string
  query: Record<string, unknown>
}

// ── Insight Definitions ──────────────────────────────────────────────────

function acquisitionFunnelInsights(): InsightDefinition[] {
  return [
    {
      name: 'Signup Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'early_access_signup_started', name: 'Signup Started' },
            { kind: 'EventsNode', event: 'google_oauth_clicked', name: 'Google OAuth Clicked' },
            { kind: 'EventsNode', event: 'user_signed_up', name: 'User Signed Up' },
            { kind: 'EventsNode', event: 'dashboard_viewed', name: 'Dashboard Viewed' },
          ],
          dateRange: { date_from: '-30d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 14 },
        },
      },
    },
    {
      name: 'Email vs Google Signup Split',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            { kind: 'EventsNode', event: 'signup_form_submitted', name: 'Email Signup' },
            { kind: 'EventsNode', event: 'google_oauth_clicked', name: 'Google OAuth' },
          ],
          dateRange: { date_from: '-30d' },
          interval: 'week',
        },
      },
    },
    {
      name: 'Login Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'login_attempted', name: 'Login Attempted' },
            { kind: 'EventsNode', event: 'user_logged_in', name: 'User Logged In' },
          ],
          dateRange: { date_from: '-30d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 1 },
        },
      },
    },
    {
      name: 'Password Reset Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'password_reset_requested', name: 'Reset Requested' },
            { kind: 'EventsNode', event: 'password_updated', name: 'Password Updated' },
          ],
          dateRange: { date_from: '-30d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 1 },
        },
      },
    },
  ]
}

function engagementInsights(): InsightDefinition[] {
  return [
    {
      name: 'Weekly Engagement Trends',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            { kind: 'EventsNode', event: 'dashboard_viewed', name: 'Dashboard Views' },
            { kind: 'EventsNode', event: 'cycles_viewed', name: 'Cycles Browsed' },
            { kind: 'EventsNode', event: 'engineer_interest_toggled', name: 'Interest Toggles' },
            { kind: 'EventsNode', event: 'hiring_spa_viewed', name: 'Hiring SPA Views' },
            { kind: 'EventsNode', event: 'github_activity_clicked', name: 'GitHub Clicks' },
          ],
          dateRange: { date_from: '-90d' },
          interval: 'week',
        },
      },
    },
    {
      name: 'Hiring SPA Questionnaire Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'hiring_spa_viewed', name: 'Viewed' },
            { kind: 'EventsNode', event: 'questionnaire_started', name: 'Started' },
            { kind: 'EventsNode', event: 'questionnaire_section_saved', name: 'Section Saved' },
            { kind: 'EventsNode', event: 'questionnaire_completed', name: 'Completed' },
          ],
          dateRange: { date_from: '-90d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 30 },
        },
      },
    },
    {
      name: 'GitHub Feed Filter Usage',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'github_feed_filtered',
              name: 'Feed Filtered',
            },
          ],
          breakdownFilter: {
            breakdown: 'filter_type',
            breakdown_type: 'event',
          },
          dateRange: { date_from: '-30d' },
          interval: 'week',
        },
      },
    },
    {
      name: 'Feature Submission Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'cycles_viewed', name: 'Cycles Viewed' },
            { kind: 'EventsNode', event: 'feature_submission_started', name: 'Submission Started' },
            { kind: 'EventsNode', event: 'feature_submitted', name: 'Feature Submitted' },
          ],
          dateRange: { date_from: '-90d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 14 },
        },
      },
    },
    {
      name: 'Settings Funnel',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: [
            { kind: 'EventsNode', event: 'settings_viewed', name: 'Viewed' },
            { kind: 'EventsNode', event: 'settings_saved', name: 'Saved' },
          ],
          dateRange: { date_from: '-30d' },
          funnelsFilter: { funnelWindowIntervalUnit: 'day', funnelWindowInterval: 1 },
        },
      },
    },
  ]
}

function retentionInsights(): InsightDefinition[] {
  return [
    {
      name: 'Weekly Retention: Signed Up -> Dashboard',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'RetentionQuery',
          retentionFilter: {
            retentionType: 'retention_first_time',
            totalIntervals: 8,
            period: 'Week',
            targetEntity: { id: 'user_signed_up', type: 'events' },
            returningEntity: { id: 'dashboard_viewed', type: 'events' },
          },
          dateRange: { date_from: '-8w' },
        },
      },
    },
    {
      name: 'Weekly Retention: Signed Up -> Interest Toggle',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'RetentionQuery',
          retentionFilter: {
            retentionType: 'retention_first_time',
            totalIntervals: 8,
            period: 'Week',
            targetEntity: { id: 'user_signed_up', type: 'events' },
            returningEntity: { id: 'engineer_interest_toggled', type: 'events' },
          },
          dateRange: { date_from: '-8w' },
        },
      },
    },
    {
      name: 'Monthly Retention: Signed Up -> Dashboard',
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'RetentionQuery',
          retentionFilter: {
            retentionType: 'retention_first_time',
            totalIntervals: 6,
            period: 'Month',
            targetEntity: { id: 'user_signed_up', type: 'events' },
            returningEntity: { id: 'dashboard_viewed', type: 'events' },
          },
          dateRange: { date_from: '-6m' },
        },
      },
    },
  ]
}

// ── Main ─────────────────────────────────────────────────────────────────

async function createDashboardWithInsights(
  apiKey: string,
  projectId: string,
  dashboardName: string,
  insights: InsightDefinition[],
) {
  console.log(`\nCreating dashboard: ${dashboardName}`)

  const dashboard = await posthogApi(
    'POST',
    `/api/projects/${projectId}/dashboards/`,
    apiKey,
    { name: dashboardName, description: `Auto-generated by setup script` },
  )

  console.log(`  Dashboard created (ID: ${dashboard.id})`)

  for (const insight of insights) {
    const created = await posthogApi(
      'POST',
      `/api/projects/${projectId}/insights/`,
      apiKey,
      {
        name: insight.name,
        query: insight.query,
        dashboards: [dashboard.id],
      },
    )
    console.log(`  + Insight: ${insight.name} (ID: ${created.id})`)
  }

  return dashboard
}

async function main() {
  console.log('PostHog Dashboard Setup')
  console.log('=======================\n')

  const { apiKey, projectId } = await getConfig()

  try {
    await createDashboardWithInsights(
      apiKey,
      projectId,
      'Company Partner Acquisition Funnel',
      acquisitionFunnelInsights(),
    )

    await createDashboardWithInsights(
      apiKey,
      projectId,
      'Company Partner Engagement',
      engagementInsights(),
    )

    await createDashboardWithInsights(
      apiKey,
      projectId,
      'Company Partner Retention',
      retentionInsights(),
    )

    console.log('\nAll 3 dashboards created successfully!')
    console.log('Open PostHog to view them.')
  } catch (err) {
    console.error('\nFailed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
