# Fractal Company Portal PRD

**URL:** partners.fractaltech.nyc  
**Version:** 1.0  
**Date:** January 27, 2025  
**Owner:** Andy Santamaria  
**Status:** Draft

---

## Executive Summary

The Fractal Company Portal is a platform for companies to discover and engage with AI engineering talent from Fractal Tech's accelerator program. Companies can watch engineers build in real-time, receive bi-weekly updates, and submit features for engineers to work on through the Cycles internship program.

---

## Goals

1. Give companies real-time visibility into Fractal's AI engineering talent
2. Create a pipeline for Cycles (internship) engagements
3. Build a database of qualified hiring partners in HubSpot
4. Enable "build in public" approach to talent showcasing

---

## User Personas

**Primary: Hiring Companies**
- Startups and companies looking for AI engineering talent
- Want to evaluate engineers before committing to hire
- Range from bootstrapped to larger companies

**Secondary: Fractal Engineers**
- Fill out profiles to be showcased on portal
- Select features to work on during Cycles

---

## Features & Requirements

### 1. Company Signup & Authentication

**Authentication Options:**
- Email/password signup
- Google sign-in (any Google account, including personal)

**Signup Form Fields:**
- Name (required)
- Work email (required)
- Company LinkedIn profile URL (required)
- Company stage (required - dropdown):
  - Bootstrapped
  - Angel
  - Pre-seed
  - Seed
  - Bigger!
- Checkbox: "Send me bi-weekly updates on the engineering cohort" (opt-in)

**Post-Signup Actions:**
1. **HubSpot Integration:**
   - Check if company exists (match by email domain)
   - If exists → Link contact to existing company
   - If new → Create new company in HubSpot
   - Add note: "Created account through partners.fractaltech.nyc portal on [date]"
   - Sync: name, email, LinkedIn, company stage, newsletter opt-in status

2. **Welcome Experience:**
   - Redirect to portal dashboard
   - Optional: brief onboarding tooltip tour

---

### 2. Portal Dashboard

**Header Section:**
- Company name / user name
- Logout button
- Settings link (manage email preferences)

#### 2.1 Cohort Overview Panel

**Display:**
- **Number of engineers** in current cohort
- **Current week** of cohort (auto-calculated)
  - Start date: February 2, 2026
  - Duration: 12 weeks (3 months)
  - Break week: Week 7 (March 15-21, 2026)
  - Calculation: `current_week = floor((today - start_date) / 7) + 1`
  - Display: "Week 7 of 12" (adjusted past break week)
- **Cohort end date** (calculated)

**Weekly Highlight:**
- CMS-managed content block
- Shows what the cohort is focused on this week
- Can include: text description, learning objectives, technologies being used
- Updated manually by Fractal team

#### 2.2 GitHub Activity Feed

**Purpose:** Real-time visibility into engineer work

**Data Sources (support both scenarios):**

**Scenario A: Fractal GitHub Organization**
- Pull activity from Fractal org repos
- Shows: PRs opened/merged, comments, commits, code reviews

**Scenario B: Individual Engineer GitHub OAuth**
- Engineers connect their personal GitHub accounts
- Portal aggregates activity from connected engineers
- Requires: GitHub OAuth flow in Engineer Profile Form

**Feed Display:**
- Reverse chronological (newest first)
- Each item shows:
  - Engineer name (or anonymized identifier)
  - Activity type (PR, comment, commit, review)
  - Repository/project name
  - Brief description or commit message
  - Timestamp
  - Link to GitHub (where appropriate)
- Pagination or infinite scroll
- Optional: Filter by activity type

#### 2.3 Spotlight Section

**Purpose:** Showcase curated content—videos, demos, highlights

**CMS-Managed Content (via `/admin/content` → Spotlight tab):**
- Video embeds (YouTube, Vimeo, Loom) — `video` type
- Embed websites/portfolios as iframes — `embed` type
- Text blocks with title and body — `text` type
- Image spotlights — `image` type

**Display:**
- Prominent placement on dashboard (above GitHub Feed)
- Shows up to 3 active items ordered by `display_order`
- Managed via admin Content page (Spotlight tab)

---

### 3. Cycles Section (Engineer Availability)

**Purpose:** Show engineers available for internship/project work

#### 3.1 Available Engineers Grid/List

**Display for each available engineer:**
- **Photo headshot**
- **Name**
- **Availability dates** (when they can start, duration available)
- **Focus areas** (what they specialize in)
- **What excites them** (brief personal statement)
- **GitHub profile link**
- **CTA Button:** "Submit a Feature"

**Data Source:**
- Engineer Profile Form (engineers fill this out)
- Manually flagged as "available for Cycles" by Fractal team

#### 3.2 Feature Submission Form

**Triggered by:** Clicking "Submit a Feature" on an engineer profile

**Form Fields:**
- **Feature title** (required)
- **Description** (required - textarea, rich text optional)
- **Timeline/Urgency** (required - dropdown):
  - No rush
  - Within 2 weeks
  - Within 1 month
  - Urgent (ASAP)
- **Tech stack involved** (optional - text or multi-select tags)
- **Interested in working with** (pre-filled with selected engineer, editable):
  - Dropdown of available engineers
  - Option: "Any available engineer"
- **Is your company hiring?** (required):
  - Radio: Yes / No
- **What types?** (shown only if "Yes" selected, multi-select, at least one required):
  - ☐ Interns
  - ☐ Contract work
  - ☐ Full-time

**On Submit:**
1. Create note on company profile in HubSpot with all feature details
2. Update HubSpot company with hiring status (`is_hiring` + `hiring_types`)
3. Success message: "Feature submitted! We'll review and connect you with an engineer if there's a match."
4. Fractal team manually reviews submissions
5. Fractal team shares relevant features with engineers
6. When matched → Fractal manually emails company with booking link for call with engineer

**Multiple Submissions:**
- Companies can submit multiple features
- No limit on submission size (Fractal manually decides if scope fits 30 hours)

---

### 4. Email Communications

#### 4.1 Bi-Weekly Cohort Updates

**Recipients:** Companies who opted in during signup

**Frequency:** Every 2 weeks

**Content:**
- Cohort progress update
- Highlights from the past 2 weeks
- Featured projects or PRs
- Upcoming milestones
- Engineers becoming available for Cycles
- CTA: "Log in to view more" / "Submit a feature"

#### 4.2 Transactional Emails

- Welcome email on signup
- Password reset (if using email/password auth)
- Feature submission confirmation
- Engineer match notification (sent manually by Fractal for now)

---

### 5. Engineer Profile Form (Separate Tool)

**Purpose:** Engineers fill out their profiles for the portal

**URL:** Could be internal form, Typeform, or simple authenticated page

**Form Fields:**
- **Name** (required)
- **Email** (required)
- **Photo headshot** (required - file upload)
- **GitHub profile URL** (required)
- **GitHub OAuth connection** (optional - for activity feed if not using org-level)
- **Focus areas** (required - multi-select or tags):
  - Frontend
  - Backend
  - Full-stack
  - AI/ML
  - Data Engineering
  - DevOps
  - Mobile
  - Other (specify)
- **What excites you?** (required - textarea, 2-3 sentences)
- **Availability for Cycles:**
  - Start date available
  - Hours per week available
  - Duration available (weeks)
- **LinkedIn profile** (optional)
- **Personal website/portfolio** (optional)

**Data Storage:**
- Database (engineers table)
- Fractal team manually flags engineers as "available for Cycles" when ready

### 5. Admin Tools

#### 5.1 Companies Hub

**Route:** `/admin/companies`

**Access:** Admin only

**Navigation:** Consolidated hub replacing the previous separate Invite and Import pages. Admin nav: `Cycles | Companies | Engineers | Content | Portal`

**Tabs:**

##### Directory Tab (default)

**Purpose:** View, search, and manage all partner companies in a split-pane layout.

**Table columns:** Name (bold), Email, Stage (badge), LinkedIn (truncated link), Joined (date)

**Filters:**
- Search by name or email (text input)
- Company stage dropdown (bootstrapped, angel, pre-seed, seed, bigger)

**Interactions:**
- Click table row → opens CompanyDetail side panel (view/edit company)
- Click "Add Company" button → opens AddCompanyForm side panel (invite flow)

**CompanyDetail panel:**
- Read-only info: email (mailto link), joined date, HubSpot contact/company IDs
- Editable fields: name, company LinkedIn URL, company stage, newsletter opt-in
- Save calls `PATCH /api/admin/companies/[id]`

**AddCompanyForm panel (invite flow):**
- Form fields: email, name, company LinkedIn, company stage, send welcome email checkbox
- Calls `POST /api/admin/invite` (same backend as before)
- Shows success message with invite link backup
- Refreshes company list on success

**API:**
- `GET /api/admin/companies` — list all non-admin profiles, ordered by created_at desc
- `GET /api/admin/companies/[id]` — single company detail
- `PATCH /api/admin/companies/[id]` — update name, company_linkedin, company_stage, newsletter_optin

##### Import Tab

**Purpose:** Bulk import companies via CSV upload. Full-width layout (no side panel).

**CSV Format:**
```csv
email,name,company_linkedin,company_stage
jane@acme.com,Jane Smith,linkedin.com/company/acme,seed
bob@startup.io,Bob Jones,linkedin.com/company/startup,pre-seed
```

**Flow:**
1. Upload CSV file
2. Preview table showing rows to import
3. Validation:
   - Required fields present
   - Valid email format
   - No duplicate emails (check against existing users)
4. Show errors inline (skip or fix)
5. Click "Import X Companies"
6. Progress bar as accounts are created
7. Summary: X created, X skipped, X failed

**On Import (per row):**
1. Create user in Supabase Auth
2. Create profile row in `users` table
3. Sync to HubSpot
4. Queue welcome email via Resend

**Options:**
- [ ] Send welcome emails (default: checked)
- [ ] Skip duplicates silently (default: checked)

**Legacy route support:**
- `/admin/invite` redirects to `/admin/companies`
- `/admin/import` redirects to `/admin/companies?tab=import`

#### 5.3 Cycles Admin Dashboard

**Route:** `/admin/cycles`

**Access:** Admin only

**Purpose:** Manage the queue of feature submissions / internship sprints

##### Queue Table View

| Column | Description | Source |
|--------|-------------|--------|
| Company | Company name (linked to HubSpot) | User profile |
| Feature | Feature title | Submission |
| Submitted | Date submitted | Submission |
| Status | Current workflow state | Submission |
| Urgency | No rush / 2 weeks / 1 month / ASAP | Submission |
| Hiring | Yes/No + types (Interns, Contract, Full-time) | Submission |
| Engineer | Assigned engineer (or "Unassigned") | Assignment |
| Sprint Day | Day X of 10 (calculated from sprint start) | Calculated |
| Hours Logged | Hours from GitHub activity | GitHub API |
| Hours Budget | 30 hrs default | Settings |

##### Status Lifecycle

```
Submitted → Reviewing → Posted → Matched → In Progress → Completed
     │          │                              │
     └──────────┴───────── Cancelled ←─────────┘
```

| Status | Description |
|--------|-------------|
| Submitted | New submission, needs review |
| Reviewing | Admin is evaluating fit |
| Posted | Shared with engineers, awaiting interest |
| Matched | Engineer assigned, pending kickoff |
| In Progress | Sprint active, work happening |
| Completed | Sprint finished |
| Cancelled | Cancelled by admin or company |

##### Filters & Tabs

- **Status tabs:** All / Submitted / In Progress / Completed / Cancelled
- **Filters:**
  - By engineer (dropdown)
  - By company (search)
  - Overdue only (sprint > 10 days)
  - Unassigned only
  - By hiring status (Yes/No)

##### Visual Alerts & Flags

| Flag | Trigger |
|------|---------|
| 🔴 Overdue | Sprint day > 10 |
| 🟡 Hours warning | Hours logged > 25 (approaching 30 limit) |
| ⚪ Stale | No GitHub activity in 3+ days while In Progress |
| 🟢 Hiring | Company is actively hiring (prioritize) |

##### Row Actions (per submission)

- **View details** — Expand to see full description, tech stack, notes
- **Change status** — Dropdown to move through workflow
- **Assign engineer** — Dropdown of available engineers (shows their current load)
- **Add internal note** — Notes only visible to admins
- **Start sprint** — Sets sprint start date, moves to "In Progress"
- **Mark complete** — Ends sprint, logs completion
- **Cancel** — Archives with reason
- **Email company** — Quick link to draft email in Resend or mailto
- **View in HubSpot** — Direct link to company record

##### Engineer Availability Sidebar

When assigning an engineer, show:
- Engineer name
- Current sprint (if any)
- Sprint day of current assignment
- Hours logged this week
- Availability status (Available / Busy / Unavailable)

##### History Log

Track all changes per submission:
- Status changes (who, when, from → to)
- Engineer assignments (who, when)
- Internal notes added
- Sprint start/end
- Hours milestones (10, 20, 30)

Display as collapsible timeline on submission detail view.

##### Calculations

**Sprint Day:**
```
sprint_day = (today - sprint_start_date).days + 1
if sprint_day > 10: flag as overdue
```

**Hours Logged:**
- Pull from GitHub API based on commits/PRs by assigned engineer on related repos
- Or: Manual entry field as fallback
- Update daily via cron job or on-demand refresh

#### 5.4 Admin Engineers Management

**Route:** `/admin/engineers`

**Access:** Admin only

**Purpose:** View, add, and edit engineers in the cohort

##### Engineers Table View

| Column | Description |
|--------|-------------|
| Name | Engineer full name |
| Email | Engineer email |
| Focus Areas | Tag badges for each focus area |
| Hours/wk | Availability hours per week |
| Available | Checkbox toggle (inline, no detail panel needed) |

##### Filters

- **Search:** Filter by name or email (text input)
- **Focus Area:** Dropdown of all focus areas across engineers
- **Available Only:** Checkbox to show only engineers with `is_available_for_cycles = true`

##### Add Engineer

- "Add Engineer" button opens side panel in create mode
- Form fields: Name, Email, GitHub URL, GitHub Username, Focus Areas (comma-separated), What Excites You, Availability (start date, hours/week, duration weeks), LinkedIn, Portfolio, Available for Cycles toggle
- On submit: `POST /api/admin/engineers`

##### Edit Engineer

- Click table row to open side panel in edit mode
- Same form as create, pre-populated with current values
- On submit: `PATCH /api/admin/engineers/[id]`

##### Quick Availability Toggle

- Checkbox directly in table row (no need to open detail panel)
- Optimistic UI update with rollback on failure
- Calls `PATCH /api/admin/engineers/[id]` with `{ is_available_for_cycles: value }`

#### 5.5 Admin Access Control

**How to flag yourself as admin:**

Option A: Supabase Dashboard → Auth → Users → Edit user → Add to `app_metadata`:
```json
{ "role": "admin" }
```

Option B: Add `is_admin` column to `users` table (simpler for now)

**Admin Route Protection:**
```typescript
// middleware or page check
const { data: user } = await supabase.auth.getUser()
const isAdmin = user?.app_metadata?.role === 'admin'
if (!isAdmin) redirect('/dashboard')
```

#### 5.6 Admin Content Management

**Route:** `/admin/content`

**Access:** Admin only

**Purpose:** Manage the dashboard's weekly highlights ("This Week" section) and spotlight items without needing the Supabase Table Editor.

**Tabs:** Highlights | Spotlight

##### Highlights Tab

**Table columns:** Week # (bold), Title, Description (truncated, HTML stripped), Created date

**Interactions:**
- Click table row → opens HighlightDetail side panel (edit mode)
- Click "Add Highlight" button → opens HighlightDetail side panel (create mode)

**HighlightDetail panel:**
- Shows "Current week is X" helper (calculated from active cohort_settings)
- Fields: Week Number (number, auto-filled to current week on create), Title (text), Description (textarea)
- Description supports HTML links (`<a href="...">text</a>`) which render on the dashboard via `dangerouslySetInnerHTML`
- Auto-fills `cohort_start_date` from active cohort on create
- Delete button on edit mode

**API:**
- `GET /api/admin/highlights` — list all highlights, ordered by week_number desc
- `POST /api/admin/highlights` — create (requires week_number, cohort_start_date, description)
- `GET /api/admin/highlights/[id]` — single highlight
- `PATCH /api/admin/highlights/[id]` — update
- `DELETE /api/admin/highlights/[id]` — delete

##### Spotlight Tab

**Table columns:** Title (bold), Type (badge), Active (toggle), Order

**Interactions:**
- Click table row → opens SpotlightDetail side panel (edit mode)
- Click "Add Spotlight" button → opens SpotlightDetail side panel (create mode)
- Click Active toggle in table → optimistic inline toggle via PATCH

**SpotlightDetail panel:**
- Fields: Title (text), Content Type (select: video / embed / text), Display Order (number), Active (checkbox)
- Content type fields:
  - **video:** Embed URL input (YouTube/Vimeo/Loom embed URLs) → inline iframe preview
  - **embed:** Website URL input (portfolio sites, etc.) → inline iframe preview
  - **text:** Body textarea
- Delete button on edit mode

**API:**
- `GET /api/admin/spotlights` — list all spotlights (including inactive), ordered by display_order asc
- `POST /api/admin/spotlights` — create (requires title, content_type)
- `GET /api/admin/spotlights/[id]` — single spotlight
- `PATCH /api/admin/spotlights/[id]` — update
- `DELETE /api/admin/spotlights/[id]` — delete

---

### Frontend
- **Framework:** Next.js (consistent with fractaltech.nyc)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

### Backend & Database: Supabase

**Supabase Project:** Fractal organization account

#### Supabase Auth
- **Email/password signup** — built-in
- **Google OAuth** — enable in Supabase Dashboard → Authentication → Providers → Google
  - Requires: Google Cloud Console OAuth credentials
  - Redirect URL: `https://[project-ref].supabase.co/auth/v1/callback`
- **Session handling:** Supabase handles JWT tokens automatically
- **Auth helpers:** Use `@supabase/auth-helpers-nextjs` for Next.js integration

#### Supabase Database (PostgreSQL)
- **Tables:** users, engineers, feature_submissions, spotlight_content, weekly_highlights, cohort_settings
- **Row Level Security (RLS):** Enable for all tables
  - Users can only read their own data
  - Engineers table: public read, authenticated write
  - Feature submissions: users can only see their own submissions
  - Spotlight/highlights: public read, admin-only write

#### Supabase Storage
- **Bucket:** `engineer-headshots`
  - Public read access (headshots displayed on portal)
  - Authenticated write (engineers upload their own photos)
- **File naming:** `{engineer_id}/headshot.{ext}`
- **Max file size:** 2MB
- **Allowed types:** image/jpeg, image/png, image/webp

#### CMS via Admin Content Page
- **Spotlight content:** Managed via `/admin/content` → Spotlight tab (CRUD with inline preview)
- **Weekly highlights:** Managed via `/admin/content` → Highlights tab (CRUD with current-week helper)
- **Cohort settings:** Edit directly in Supabase Table Editor

#### Supabase Setup Checklist
- [ ] Create project in Fractal organization
- [ ] Enable Google OAuth provider
- [ ] Run database migrations (create tables)
- [ ] Enable RLS policies
- [ ] Create storage bucket for headshots
- [ ] Set up environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### Analytics: PostHog

**Purpose:** User session analytics, event tracking, funnel analysis

**What to track:**
- Page views (automatic)
- Session recordings (see how companies use the portal)
- User identification (link sessions to company accounts)
- Custom events:
  - `signup_started` — landed on signup page
  - `signup_completed` — account created
  - `dashboard_viewed` — viewed main dashboard
  - `engineer_profile_viewed` — clicked into an engineer profile
  - `feature_submission_started` — opened feature form
  - `feature_submission_completed` — submitted a feature
  - `spotlight_video_played` — watched a spotlight video

**PostHog Setup:**
- Create project at posthog.com (free tier: 1M events/month)
- Enable session recordings
- Set up user identification to link anonymous → authenticated sessions

**Environment Variables:**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Analytics: PostHog

**Purpose:** User analytics, session recordings, event tracking, funnels

**PostHog Features to Use:**
- **Session Recordings:** Watch how companies navigate the portal
- **Event Tracking:** Track key actions (signup, feature submission, engineer views)
- **Funnels:** Measure conversion from signup → feature submission
- **User Identification:** Link sessions to company accounts

**Key Events to Track:**
| Event Name | Trigger | Properties |
|------------|---------|------------|
| `user_signed_up` | Account creation | `auth_method`, `company_stage`, `newsletter_optin` |
| `user_logged_in` | Login | `auth_method` |
| `dashboard_viewed` | Dashboard load | — |
| `engineer_profile_viewed` | Click engineer card | `engineer_id`, `engineer_name` |
| `feature_submission_started` | Open submission form | `engineer_id` |
| `feature_submission_completed` | Submit feature | `engineer_id`, `timeline`, `hiring_status` |
| `spotlight_video_played` | Play video | `content_id`, `content_title` |
| `github_activity_clicked` | Click activity item | `activity_type` |

**User Identification:**
- Call `posthog.identify()` on login with user ID
- Set user properties: `email`, `company_name`, `company_stage`, `signup_date`
- This links all sessions to the same user

**PostHog Setup Checklist:**
- [ ] Create PostHog account/project (Cloud or self-hosted)
- [ ] Get Project API Key
- [ ] Add environment variable: `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] Add PostHog host: `NEXT_PUBLIC_POSTHOG_HOST` (usually `https://app.posthog.com`)
- [ ] Enable session recordings in PostHog dashboard

### Integrations

#### HubSpot API
- **Create/Update Company:** POST /crm/v3/objects/companies
- **Create Contact:** POST /crm/v3/objects/contacts
- **Associate Contact to Company:** POST /crm/v3/associations
- **Create Note:** POST /crm/v3/objects/notes
- **Search Company by Domain:** POST /crm/v3/objects/companies/search

**HubSpot Data Mapping:**
| Portal Field | HubSpot Property |
|--------------|------------------|
| Company LinkedIn | linkedin_company_page |
| Company Stage | company_stage (custom) |
| Newsletter Opt-in | portal_newsletter_optin (custom) |
| Portal Signup Date | portal_signup_date (custom) |
| Is Hiring | is_hiring (custom) |
| Hiring Types | hiring_types (custom) |

#### GitHub API

**Scenario A: Organization-Level**
- **Org Activity:** GET /orgs/{org}/events
- **Repo PRs:** GET /repos/{owner}/{repo}/pulls
- **Repo Commits:** GET /repos/{owner}/{repo}/commits

**Scenario B: Individual OAuth**
- **OAuth Scopes:** read:user, repo (read-only)
- **User Events:** GET /users/{username}/events
- Store OAuth tokens securely per engineer

**Hybrid Approach:**
- Start with org-level if all work flows through Fractal repos
- Add individual OAuth as fallback for engineers with external repos
- Activity feed merges both sources

#### Email Service: Resend

**Provider:** Resend (resend.com)
- Free tier: 3,000 emails/month (plenty for ~100 companies)
- React Email for templates
- Simple API, built for Next.js

**Environment Variables:**
```
RESEND_API_KEY=re_...
EMAIL_FROM=partners@fractaltech.nyc
```

**Email Types:**

| Email | Trigger | Recipients |
|-------|---------|------------|
| Welcome | Account creation | New user |
| Feature Submitted | Feature submission | Submitter |
| Bi-weekly Cohort Update | Vercel Cron (every 2 weeks) | All users with `newsletter_optin = true` |
| Engineer Available | Manual trigger or DB trigger | All users with `newsletter_optin = true` |

**Bi-weekly Newsletter Flow:**
```
Vercel Cron (every 2 weeks, e.g., Monday 9am ET)
         ↓
API route: /api/emails/cohort-update
         ↓
Query Supabase: SELECT * FROM users WHERE newsletter_optin = true
         ↓
Build email content:
  - Cohort progress (week X of 12)
  - Highlights from past 2 weeks
  - Featured PRs/projects
  - Engineers becoming available
         ↓
Loop: Send via Resend API
         ↓
Log send status
```

**Engineer Available Notification Flow:**
```
Fractal team marks engineer as available in Supabase Dashboard
(is_available_for_cycles = true)
         ↓
Option A: Manual trigger via admin action
Option B: Supabase Database Webhook → API route
         ↓
API route: /api/emails/engineer-available
         ↓
Query opted-in users, send notification via Resend
```

**Vercel Cron Setup (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/emails/cohort-update",
      "schedule": "0 14 * * 1"
    }
  ]
}
```
*Runs every Monday at 2pm UTC (9am ET)*

**Resend Setup Checklist:**
- [ ] Create Resend account
- [ ] Verify sending domain (fractaltech.nyc)
- [ ] Get API key
- [ ] Add `RESEND_API_KEY` to Vercel environment variables

---

## Next.js + Supabase Integration

### Package Dependencies
```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/auth-helpers-nextjs": "^0.8.x",
  "@supabase/auth-ui-react": "^0.4.x",
  "@supabase/auth-ui-shared": "^0.1.x",
  "posthog-js": "^1.x",
  "resend": "^2.x",
  "@react-email/components": "^0.x",
  "papaparse": "^5.x"
}
```

### Environment Variables (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, never expose to client

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=partners@fractaltech.nyc

# HubSpot
HUBSPOT_API_KEY=pat-na1-...

# GitHub (if using org-level access)
GITHUB_ORG=fractal-tech
GITHUB_TOKEN=ghp_...
```

### Supabase Client Setup

**lib/supabase/client.ts** (browser client)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**lib/supabase/server.ts** (server client)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### Auth Flow (Google + Email)

**app/auth/callback/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

---

## User Flows

### Flow 1: Company Signup

```
┌─────────────────────────────────────────────────────────────────┐
│                    partners.fractaltech.nyc                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Signup Page                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Sign up with Google]                                   │    │
│  │            — or —                                        │    │
│  │  Email: [________________________]                       │    │
│  │  Password: [____________________]                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Name: [________________________]                                │
│  Company LinkedIn: [________________________]                    │
│  Company Stage: [Dropdown: Bootstrapped/Angel/Pre-seed/...]     │
│                                                                  │
│  ☐ Send me bi-weekly updates on the engineering cohort          │
│                                                                  │
│  [Create Account]                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Actions:                                                │
│  1. Create user in auth system                                   │
│  2. Check HubSpot for existing company (by email domain)         │
│  3. Create or link company in HubSpot                            │
│  4. Add note: "Signed up via portal on [date]"                   │
│  5. Sync all fields to HubSpot                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Portal Dashboard                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Submit a Feature for Cycles

```
┌─────────────────────────────────────────────────────────────────┐
│  Cycles Section - Available Engineers                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  [Headshot]  │  │  [Headshot]  │  │  [Headshot]  │           │
│  │  Alex M.     │  │  Jordan K.   │  │  Sam R.      │           │
│  │  Full-stack  │  │  AI/ML       │  │  Backend     │           │
│  │  Available   │  │  Available   │  │  Available   │           │
│  │  Feb 15      │  │  Mar 1       │  │  Feb 20      │           │
│  │              │  │              │  │              │           │
│  │ [Submit a    │  │ [Submit a    │  │ [Submit a    │           │
│  │  Feature]    │  │  Feature]    │  │  Feature]    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                       Click "Submit a Feature"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Feature Submission Form (Modal or Page)                         │
│                                                                  │
│  Feature Title: [________________________]                       │
│                                                                  │
│  Description:                                                    │
│  [                                                    ]          │
│  [                                                    ]          │
│  [                                                    ]          │
│                                                                  │
│  Timeline: [Dropdown: No rush / 2 weeks / 1 month / Urgent]     │
│                                                                  │
│  Tech Stack: [Tags or text input]                                │
│                                                                  │
│  Interested in: [Dropdown: Alex M. ▼] (pre-selected)            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Is your company hiring?                                         │
│  ○ Yes  ○ No                                                     │
│                                                                  │
│  [If Yes:]                                                       │
│  What types? (select all that apply)                             │
│  ☐ Interns                                                       │
│  ☐ Contract work                                                 │
│  ☐ Full-time                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  [Submit Feature]                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Actions:                                                │
│  1. Store feature submission in database                         │
│  2. Create note on company in HubSpot with feature details       │
│  3. Update company hiring status in HubSpot                      │
│  4. (Future: Notify Fractal team via Slack/email)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Success Message                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ✓ Feature submitted!                                    │    │
│  │                                                          │    │
│  │  We'll review your submission and connect you with an    │    │
│  │  engineer if there's a match.                            │    │
│  │                                                          │    │
│  │  [Back to Dashboard]  [Submit Another Feature]           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Manual Process (Fractal Team):                                  │
│  1. Review feature submissions in HubSpot                        │
│  2. Share relevant features with available engineers             │
│  3. Engineers express interest                                   │
│  4. Fractal emails company with booking link for matched engr    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: Engineer Fills Out Profile

```
┌─────────────────────────────────────────────────────────────────┐
│  Engineer Profile Form (Internal Tool)                           │
│                                                                  │
│  Name: [________________________]                                │
│  Email: [________________________]                               │
│                                                                  │
│  Photo: [Upload Headshot]                                        │
│                                                                  │
│  GitHub Profile: [https://github.com/________]                   │
│  [Connect GitHub Account] ← OAuth for activity feed              │
│                                                                  │
│  Focus Areas: (select all that apply)                            │
│  ☐ Frontend  ☐ Backend  ☐ Full-stack  ☐ AI/ML                   │
│  ☐ Data Engineering  ☐ DevOps  ☐ Mobile  ☐ Other                │
│                                                                  │
│  What excites you? (2-3 sentences)                               │
│  [                                                    ]          │
│  [                                                    ]          │
│                                                                  │
│  Availability for Cycles:                                        │
│  Start Date: [__/__/____]                                        │
│  Hours/Week: [___]                                               │
│  Duration: [___] weeks                                           │
│                                                                  │
│  LinkedIn (optional): [________________________]                 │
│  Portfolio (optional): [________________________]                │
│                                                                  │
│  [Save Profile]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Admin Single Company Invite

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Invite Page (/admin/invite)                               │
│                                                                  │
│  Email: [________________________]                               │
│  Name: [________________________]                                │
│  Company LinkedIn: [________________________]                    │
│  Company Stage: [Dropdown ▼]                                    │
│                                                                  │
│  ☑ Send welcome email                                           │
│                                                                  │
│  [Create Account]                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Actions:                                                │
│  1. Create user in Supabase Auth (invite flow)                   │
│  2. Create profile row in users table                            │
│  3. Sync to HubSpot (create/link company + contact)              │
│  4. Send welcome email via Resend (if checked)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Success Message                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ✓ Account created for jane@acme.com                     │    │
│  │                                                          │    │
│  │  Invite link (backup): https://...                       │    │
│  │                                                          │    │
│  │  [Invite Another]  [View All Companies]                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 5: Admin CSV Bulk Import

```
┌─────────────────────────────────────────────────────────────────┐
│  CSV Import Page (/admin/import)                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Drag & drop CSV file here                               │    │
│  │  or [Browse Files]                                       │    │
│  │                                                          │    │
│  │  Expected columns:                                       │    │
│  │  email, name, company_linkedin, company_stage            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ☑ Send welcome emails                                          │
│  ☑ Skip duplicates silently                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                        Upload CSV
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preview & Validation                                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  EMAIL              NAME           STAGE     STATUS      │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  jane@acme.com      Jane Smith     seed      ✓ Ready    │    │
│  │  bob@startup.io     Bob Jones      pre-seed  ✓ Ready    │    │
│  │  invalid-email      Sam Wilson     angel     ✗ Invalid  │    │
│  │  existing@co.com    Existing User  seed      ⊘ Skip     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Ready: 2  │  Errors: 1  │  Skipped: 1                          │
│                                                                  │
│  [Cancel]  [Import 2 Companies]                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                       Click Import
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Importing...                                                    │
│                                                                  │
│  ████████████░░░░░░░░  2/2                                      │
│                                                                  │
│  ✓ jane@acme.com - Created                                      │
│  ✓ bob@startup.io - Created                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Import Complete                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ✓ 2 accounts created                                    │    │
│  │  ⊘ 1 skipped (duplicate)                                 │    │
│  │  ✗ 1 failed (invalid email)                              │    │
│  │                                                          │    │
│  │  [Download Results CSV]  [Import More]  [Done]           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 6: Admin Manages Cycles Queue

```
┌─────────────────────────────────────────────────────────────────┐
│  Cycles Admin Dashboard (/admin/cycles)                          │
│                                                                  │
│  [Submitted] [Reviewing] [Posted] [In Progress] [Completed]     │
│                                                                  │
│  Filter: [All Engineers ▼] [Overdue Only ☐] [Unassigned ☐]     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ COMPANY     FEATURE        STATUS    ENG    DAY  HRS  FLAG  ││
│  │ ──────────────────────────────────────────────────────────  ││
│  │ Acme Inc    Add AI search  In Prog   Alex   8    22   🟡    ││
│  │ StartupCo   Dashboard UI   Posted    —      —    —         ││
│  │ BigCorp     API integ...   In Prog   Sam    12   18   🔴    ││
│  │ NewCo       ML pipeline    Submitted —      —    —    🟢    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  🔴 = Overdue (>10 days)  🟡 = Hours warning (>25)  🟢 = Hiring │
└─────────────────────────────────────────────────────────────────┘
                              │
                        Click row
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Submission Detail (Slide-out or Modal)                          │
│                                                                  │
│  Acme Inc — Add AI search to docs              [View in HubSpot]│
│  ───────────────────────────────────────────────────────────────│
│                                                                  │
│  Description:                                                    │
│  We need vector search across our documentation...               │
│                                                                  │
│  Tech Stack: React, Python, OpenAI API                          │
│  Timeline: Within 2 weeks                                        │
│  Hiring: Yes — Interns, Full-time                               │
│  Submitted: Jan 15, 2025                                         │
│                                                                  │
│  ───────────────────────────────────────────────────────────────│
│  STATUS          ENGINEER              SPRINT                    │
│  [In Progress ▼] [Alex M. ▼]          Day 8 of 10               │
│                                        22 / 30 hours             │
│  ───────────────────────────────────────────────────────────────│
│                                                                  │
│  Internal Notes:                                                 │
│  [                                                    ]          │
│  [Save Note]                                                     │
│                                                                  │
│  ───────────────────────────────────────────────────────────────│
│  History:                                                        │
│  • Jan 20 — Status → In Progress (by Andy)                      │
│  • Jan 18 — Assigned to Alex M. (by Andy)                       │
│  • Jan 17 — Status → Matched (by Andy)                          │
│  • Jan 16 — Status → Posted (by Andy)                           │
│  • Jan 15 — Submitted                                           │
│                                                                  │
│  [Mark Complete]  [Cancel Sprint]  [Email Company]              │
└─────────────────────────────────────────────────────────────────┘
                              │
                      Assign Engineer
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Assign Engineer (Dropdown with availability)                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Alex M.     ● Available    No current sprint           │    │
│  │  Sam R.      ● Busy         Day 5 of sprint (BigCorp)   │    │
│  │  Jordan K.   ○ Unavailable  On break until Feb 1        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                      Select & Confirm
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Actions:                                                │
│  1. Update submission: assigned_engineer_id, status → matched   │
│  2. Log to submission_history                                    │
│  3. (Optional) Notify engineer via email/Slack                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Supabase PostgreSQL)

```sql
-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (companies/contacts)
-- Note: Auth users are stored in auth.users, this table extends with profile data
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  company_linkedin VARCHAR NOT NULL,
  company_stage VARCHAR NOT NULL,
  newsletter_optin BOOLEAN DEFAULT false,
  hubspot_company_id VARCHAR,
  hubspot_contact_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Users can only read/update their own row
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Engineers
CREATE TABLE engineers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  photo_url VARCHAR,
  github_url VARCHAR NOT NULL,
  github_oauth_token VARCHAR, -- encrypted, for individual OAuth
  focus_areas TEXT[], -- PostgreSQL array
  what_excites_you TEXT,
  availability_start DATE,
  availability_hours_per_week INT,
  availability_duration_weeks INT,
  linkedin_url VARCHAR,
  portfolio_url VARCHAR,
  is_available_for_cycles BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Public can read engineers marked available, only admins can write
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available engineers" ON engineers
  FOR SELECT USING (is_available_for_cycles = true);

CREATE POLICY "Admins can manage engineers" ON engineers
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Feature Submissions
-- Feature Submissions (Cycles Internships)
CREATE TABLE feature_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  timeline VARCHAR NOT NULL, -- 'no-rush', '2-weeks', '1-month', 'urgent'
  tech_stack TEXT,
  is_hiring BOOLEAN NOT NULL,
  hiring_types TEXT[], -- array: 'interns', 'contract', 'full-time' (null if is_hiring = false)
  
  -- Assignment & Sprint
  assigned_engineer_id UUID REFERENCES engineers(id), -- null until matched
  preferred_engineer_id UUID REFERENCES engineers(id), -- from submission form ("interested in")
  status VARCHAR DEFAULT 'submitted', -- submitted, reviewing, posted, matched, in_progress, completed, cancelled
  sprint_start_date DATE, -- when work begins
  sprint_end_date DATE, -- when completed/cancelled
  hours_budget INT DEFAULT 30,
  hours_logged DECIMAL(5,2) DEFAULT 0, -- updated from GitHub or manual entry
  
  -- HubSpot
  hubspot_note_id VARCHAR,
  
  -- Internal
  internal_notes TEXT, -- admin-only notes
  cancelled_reason TEXT, -- if cancelled
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Users can only see their own submissions
ALTER TABLE feature_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON feature_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions" ON feature_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" ON feature_submissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Submission History Log (audit trail)
CREATE TABLE submission_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES feature_submissions(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL, -- 'status_change', 'engineer_assigned', 'note_added', 'hours_updated', 'sprint_started', 'sprint_ended'
  actor_id UUID REFERENCES users(id), -- who made the change (admin)
  old_value TEXT, -- previous value (for status changes, assignments)
  new_value TEXT, -- new value
  note TEXT, -- optional description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Admins only
ALTER TABLE submission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view history" ON submission_history
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert history" ON submission_history
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Spotlight Content (CMS - managed via /admin/content)
CREATE TABLE spotlight_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL, -- video, text, image, embed
  content_url VARCHAR, -- for videos/images/embeds
  content_body TEXT, -- for text content
  is_active BOOLEAN DEFAULT true,
  display_order INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Public read, admin write
ALTER TABLE spotlight_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active spotlight" ON spotlight_content
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage spotlight" ON spotlight_content
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Weekly Highlights (CMS - managed via /admin/content)
CREATE TABLE weekly_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INT NOT NULL,
  cohort_start_date DATE NOT NULL,
  title VARCHAR,
  description TEXT NOT NULL,
  technologies TEXT[], -- array of tech tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy: Public read
ALTER TABLE weekly_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view highlights" ON weekly_highlights
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage highlights" ON weekly_highlights
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Cohort Settings
CREATE TABLE cohort_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  duration_weeks INT DEFAULT 12,
  break_week INT, -- which week is the break, null if none set
  is_active BOOLEAN DEFAULT true
);

-- RLS Policy: Public read (anyone can see cohort info)
ALTER TABLE cohort_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cohort settings" ON cohort_settings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cohort" ON cohort_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER engineers_updated_at
  BEFORE UPDATE ON engineers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Storage Bucket Setup

```sql
-- Run in Supabase SQL Editor or set up via Dashboard

-- Create bucket for engineer headshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('engineer-headshots', 'engineer-headshots', true);

-- Policy: Anyone can view headshots
CREATE POLICY "Public headshot access"
ON storage.objects FOR SELECT
USING (bucket_id = 'engineer-headshots');

-- Policy: Authenticated users can upload (for engineer profile form)
CREATE POLICY "Authenticated users can upload headshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'engineer-headshots'
  AND auth.role() = 'authenticated'
);
```

---

## Pages & Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing / Signup | No |
| `/login` | Login page | No |
| `/signup` | Signup page | No |
| `/dashboard` | Main portal dashboard | Yes |
| `/cycles` | Available engineers for Cycles | Yes |
| `/cycles/submit` | Feature submission form | Yes |
| `/settings` | User settings (email prefs) | Yes |
| `/admin` | Admin dashboard | Yes (admin only) |
| `/admin/companies` | Companies hub (directory + import) | Yes (admin only) |
| `/admin/cycles` | Cycles queue management | Yes (admin only) |
| `/admin/engineers` | Engineer CRUD management | Yes (admin only) |
| `/admin/invite` | Redirects to `/admin/companies` | Yes (admin only) |
| `/admin/import` | Redirects to `/admin/companies?tab=import` | Yes (admin only) |
| `/engineer/profile` | Engineer profile form | Yes (engineers only) |

---

## Success Metrics

**Signup & Engagement:**
- Number of company accounts created
- % newsletter opt-in rate
- Monthly active users (logins)
- Time spent on portal per session

**Cycles Conversion:**
- Number of feature submissions
- % of companies submitting features
- % of companies marked as "hiring" (qualified)
- Number of successful engineer-company matches
- Features → Calls booked conversion rate

**Cycles Operations:**
- Average time from submitted → matched
- Average sprint duration (target: ≤10 days)
- % of sprints completed on time
- Average hours logged per sprint
- Overdue sprint rate

**Content Engagement:**
- GitHub feed interactions (clicks to GitHub)
- Spotlight content views
- Bi-weekly email open rates and click-through rates

---

## Timeline

### Phase 0: Supabase & Infrastructure Setup (Week 1)
- [ ] Create Supabase project in Fractal organization
- [ ] Run database migrations (create all tables)
- [ ] Enable RLS policies on all tables
- [ ] Set up Google OAuth provider in Supabase Dashboard
- [ ] Create storage bucket for engineer headshots
- [ ] Create Resend account and verify domain (fractaltech.nyc)
- [ ] Create PostHog project
- [ ] Set up Vercel project and connect to repo
- [ ] Configure environment variables in Vercel
- [ ] Set up domain: partners.fractaltech.nyc → Vercel

### Phase 1: Core Portal (Weeks 2-3)
- [ ] Signup/auth flow (email + Google via Supabase Auth)
- [ ] User profile creation (linked to auth.users)
- [ ] HubSpot integration (create company, add notes)
- [ ] Dashboard layout with cohort overview
- [ ] GitHub activity feed (start with org-level)
- [ ] Admin: Single company invite page (`/admin/invite`)
- [ ] Admin: CSV bulk import (`/admin/import`)
- [ ] Basic responsive design

### Phase 2: Cycles & Submissions (Weeks 4-5)
- [ ] Engineer profiles display
- [ ] Feature submission form (with hiring status two-step)
- [ ] HubSpot note creation for submissions
- [ ] Success states and confirmation
- [ ] Admin: Cycles dashboard (`/admin/cycles`)
  - [ ] Queue table view with filters
  - [ ] Status workflow (submitted → reviewing → posted → matched → in_progress → completed)
  - [ ] Engineer assignment UI
  - [ ] Sprint day calculation & overdue flags
  - [ ] Hours logged display (manual entry for V1)
  - [ ] Internal notes
  - [ ] History log (audit trail)
  - [ ] HubSpot link per company
  - [ ] Engineer availability sidebar

### Phase 3: Content & Polish (Weeks 6-7)
- [ ] Spotlight section (reads from Supabase, you edit via Dashboard)
- [ ] Weekly highlights display (reads from Supabase, you edit via Dashboard)
- [ ] Engineer profile form (with headshot upload to Supabase Storage)
- [ ] Email templates in React Email:
  - [ ] Welcome email
  - [ ] Feature submission confirmation
  - [ ] Bi-weekly cohort update
  - [ ] Engineer available notification
- [ ] Vercel Cron job for bi-weekly emails
- [ ] Manual trigger for engineer availability emails

### Phase 4: Testing & Launch (Week 8)
- [ ] End-to-end testing
- [ ] Mobile responsiveness
- [ ] Security review
- [ ] Soft launch to select companies
- [ ] Public launch

---

## Open Questions

1. **Break week:** When is the cohort break week? (Can add later)
2. **Engineer profile access:** Should engineers log in to the same portal with different role, or use a separate form/page?
3. **GitHub org name:** What's the Fractal GitHub org for activity feed?
4. **Admin access:** Who needs admin access to Supabase Dashboard for CMS updates? (You + anyone else?)
5. **Domain setup:** Is partners.fractaltech.nyc ready to configure in Vercel?
6. **Google OAuth:** Do you have a Google Cloud Console account for OAuth credentials, or should I set one up?

---

## Appendix

### A. HubSpot Custom Properties Needed

Create these custom properties in HubSpot:

**Company Properties:**
- `portal_signup_date` (date)
- `company_stage` (dropdown: Bootstrapped, Angel, Pre-seed, Seed, Bigger!)
- `portal_newsletter_optin` (boolean)
- `is_hiring` (boolean)
- `hiring_types` (multi-select: Interns, Contract, Full-time)

**Contact Properties:**
- `portal_user` (boolean)
- `portal_signup_date` (date)

### B. Note Template for Feature Submissions

```
📋 FEATURE SUBMISSION via Company Portal

Title: {title}
Submitted: {date}

Description:
{description}

Timeline: {timeline}
Tech Stack: {tech_stack}
Interested Engineer: {engineer_name or "Any available"}

Hiring: {is_hiring ? "Yes" : "No"}
Hiring Types: {hiring_types.join(", ") or "N/A"}

---
Submitted through partners.fractaltech.nyc
```

### C. CSV Import Template

**File:** `company-import-template.csv`

```csv
email,name,company_linkedin,company_stage
jane@acme.com,Jane Smith,linkedin.com/company/acme,seed
bob@startup.io,Bob Jones,linkedin.com/company/startupco,pre-seed
sara@bigco.com,Sara Lee,linkedin.com/company/bigco,bigger
mike@bootstrap.co,Mike Chen,linkedin.com/company/bootstrap,bootstrapped
```

**Column Definitions:**

| Column | Required | Valid Values |
|--------|----------|--------------|
| `email` | Yes | Valid email format |
| `name` | Yes | Contact name |
| `company_linkedin` | Yes | LinkedIn company URL (with or without https://) |
| `company_stage` | Yes | `bootstrapped`, `angel`, `pre-seed`, `seed`, `bigger` |

**Notes:**
- First row must be headers
- Case-insensitive for company_stage
- Duplicate emails (already in system) will be skipped
- Invalid rows shown in preview before import
