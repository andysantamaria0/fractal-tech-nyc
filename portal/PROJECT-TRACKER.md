# Fractal Company Portal - Project Tracker

**Portal URL:** partners.fractaltech.nyc (pending DNS) / fractal-partners-portal.vercel.app (live)
**Repo:** andysantamaria0/fractal-tech-nyc (root directory: `portal/`)
**Vercel Project:** fractal-partners-portal
**Stack:** Next.js 15 + TypeScript + Supabase + HubSpot + Resend
**Last Updated:** January 31, 2026

---

## Overall Progress

| Phase | Description | Status | Progress |
|-------|-------------|--------|----------|
| 0 | Infrastructure & Scaffold | COMPLETE | 100% |
| 1 | Schema Updates & Feature Submission | COMPLETE | 100% |
| 2 | Admin Foundation & Invite Tools | COMPLETE | 100% |
| 3 | Admin Cycles Dashboard | COMPLETE | 100% |
| 4 | Engineer Profile Form & Email System | COMPLETE | 100% |
| 5 | PostHog Analytics & Polish | IN PROGRESS | 98% |
| 6 | Deployment & Infrastructure | IN PROGRESS | 85% |

---

## Phase 0: Infrastructure & Scaffold — COMPLETE

- [x] Next.js 15 project scaffolded with TypeScript
- [x] Supabase Auth (email/password + Google OAuth)
- [x] Supabase client/server setup (`lib/supabase/`)
- [x] Database migration (`001_initial_schema.sql`) — 6 tables with RLS
- [x] Middleware for auth route protection
- [x] HubSpot API integration (`lib/hubspot.ts`)
- [x] GitHub API integration (`lib/github.ts`)
- [x] Company signup flow (two-step: auth → profile)
- [x] HubSpot sync on signup (company create/link, contact, note)
- [x] Dashboard page (Cohort Overview, GitHub Feed, Spotlight, Engineers)
- [x] Cycles page (browse available engineers)
- [x] Settings page (newsletter opt-in toggle)
- [x] Full CSS design system (Classic Mac / Snow White theme)
- [x] Environment variables configured
- [x] Dev mode with demo data fallback

---

## Phase 1: Schema Updates & Feature Submission — COMPLETE

### Database Migration
- [x] Create `002_cycles_and_admin.sql` migration
- [x] Expand `feature_submissions` table (assigned_engineer_id, preferred_engineer_id, full status lifecycle, sprint fields, hours tracking, internal_notes, cancelled_reason)
- [x] Update hiring fields (`is_hiring` boolean + `hiring_types` text array)
- [x] Create `submission_history` table (audit trail)
- [x] Add `is_admin` boolean to `profiles` table
- [x] Add admin RLS policies (admins can read/write all tables)
- [x] Performance indexes on key columns

### Feature Submission Form
- [x] Build full submission form at `/cycles/submit`
- [x] Form fields: title, description, timeline dropdown, tech stack, preferred engineer, is_hiring radio, hiring_types checkboxes
- [x] Pre-fill engineer from query param (`?engineer={id}`)
- [x] Create API route `POST /api/submissions`
- [x] Insert submission to Supabase
- [x] Create HubSpot note on submission
- [x] Update HubSpot company hiring status
- [x] Success state with CTAs

### My Submissions Page
- [x] Build `/cycles/submissions` page showing user's own submissions
- [x] Status badges with color coding
- [x] Submission details display (timeline, tech stack, hiring status)

### EngineerCard Update
- [x] Add "Submit a Feature" CTA button to EngineerCard
- [x] Link to `/cycles/submit?engineer={id}`

---

## Phase 2: Admin Foundation & Invite Tools — COMPLETE

### Admin Access Control
- [x] Admin layout (`app/admin/layout.tsx`) with auth check and admin nav
- [x] `is_admin` check on profile in layout (redirects non-admins to /dashboard)
- [x] Dev bypass for local development
- [x] Admin nav: Cycles, Companies, Engineers, Portal link (consolidated from Cycles, Engineers, Invite, Import, Portal)

### Single Company Invite (`/admin/invite`)
- [x] Build invite form (email, name, company LinkedIn, stage, send email checkbox)
- [x] Create API route `POST /api/admin/invite`
- [x] Create Supabase Auth user (invite flow)
- [x] Create profile row
- [x] Sync to HubSpot (find/create company, create contact, associate)
- [x] Send welcome email via Resend using WelcomeEmail template (if checked)
- [x] Show success message

### CSV Bulk Import (`/admin/import`)
- [x] Build CSV upload UI with file input
- [x] CSV parsing with validation (email, name, LinkedIn, stage)
- [x] Preview table with validation status (OK / error message)
- [x] Create API route `POST /api/admin/import`
- [x] Summary (created/skipped/failed) with details table
- [x] "Import Another File" reset flow

---

## Phase 3: Admin Cycles Dashboard — COMPLETE

### Queue Table View (`/admin/cycles`)
- [x] Build table with columns: Company, Feature, Submitted, Status, Urgency, Engineer, Sprint Day, Hours, Flags
- [x] Status tabs: All / Submitted / In Progress / Completed / Cancelled
- [x] Filters: overdue only, unassigned only, hiring only
- [x] Visual flags: OVERDUE (red), HOURS WARNING (yellow), STALE (gray), HIRING (green)
- [x] Create API route `GET /api/admin/cycles` with query param filtering

### Submission Detail View
- [x] Split-layout detail panel (side-by-side with table)
- [x] Company info display (name, email, LinkedIn link)
- [x] Full description and metadata display
- [x] Status change dropdown (submitted → reviewing → posted → matched → in_progress → completed/cancelled)
- [x] Cancellation reason field (shown when cancelled)
- [x] Engineer assignment component with availability display
- [x] Sprint management (start date, end date, hours budget, hours logged)
- [x] Internal notes (admin-only, textarea)
- [x] History log timeline with who/when/what changed
- [x] HubSpot link per company
- [x] Create API routes: `GET/PATCH /api/admin/cycles/[id]`, `GET /api/admin/cycles/[id]/history`
- [x] Audit trail: all changes logged to `submission_history` table

### Sprint Calculations
- [x] Sprint day auto-calculation (today - sprint_start_date)
- [x] Overdue detection (sprint_end_date < today while in_progress)
- [x] Hours logged tracking (manual entry for V1)

---

## Phase 4: Engineer Profile Form & Email System — COMPLETE

### Engineer Profile Form (`/engineer/profile`)
- [x] Build profile form: name, email (read-only), photo upload, GitHub URL, focus areas (multi-select tags), "what excites you", availability (start/hours/duration), LinkedIn, portfolio
- [x] Photo upload to Supabase Storage (`engineer-headshots` bucket)
- [x] Create API route `POST /api/engineer/profile` (upsert — create or update)
- [x] GitHub username extraction from URL
- [x] Validation (name, GitHub URL format, optional URL formats)
- [x] Storage bucket policies in 002 migration (public read, authenticated upload)

### Email Templates (HTML with Snow White theme)
- [x] Welcome email template (`emails/welcome.tsx`)
- [x] Feature submission confirmation template (`emails/feature-submitted.tsx`)
- [x] Bi-weekly cohort update template (`emails/cohort-update.tsx`)
- [x] Engineer available notification template (`emails/engineer-available.tsx`)

### Email API Routes & Cron
- [x] `POST /api/emails/welcome` — welcome email
- [x] `POST /api/emails/feature-submitted` — submission confirmation
- [x] `GET+POST /api/emails/cohort-update` — bi-weekly cron endpoint (supports both methods)
- [x] `POST /api/emails/engineer-available` — admin-triggered engineer availability notification
- [x] Wire welcome email into signup flow
- [x] Wire confirmation email into feature submission flow
- [x] Configure Vercel Cron for bi-weekly newsletter (`vercel.json` — Monday 2pm UTC / 9am ET)

---

## Phase 5: PostHog Analytics & Polish — IN PROGRESS

### PostHog Integration
- [x] Set up PostHog client (`lib/posthog.ts`)
- [x] Create PostHogProvider component
- [x] Add to root layout (wrapped in Suspense)
- [x] Automatic pageview tracking
- [x] User identification on login (`posthog.identify()`)
- [x] Track `user_signed_up` event (with auth_method, company_stage, newsletter_optin)
- [x] Track `user_logged_in` event (with auth_method)
- [x] Track `feature_submission_started` event (with engineer_id)
- [x] Track `feature_submission_completed` event (with engineer_id, timeline, hiring_status)
- [x] Track `engineer_profile_viewed` event (with engineer_id, engineer_name)
- [x] Track `spotlight_video_played` event
- [x] Track `github_activity_clicked` event
- [x] Track `signup_started` event (landed on signup page)
- [x] Track `dashboard_viewed` event (on dashboard load)
- [x] Enable PostHog session recordings

### Polish & QA
- [x] Error boundaries (`error.tsx` for portal and admin)
- [x] Not-found page (`not-found.tsx`)
- [x] Loading skeleton states (dashboard, cycles, admin)
- [x] Mobile responsiveness audit (all pages including admin)
- [x] Security review (RLS policies, admin middleware, input sanitization)
- [ ] End-to-end testing against live Supabase
- [ ] Soft launch to select companies
- [ ] Public launch

### Admin Engineers Management (`/admin/engineers`)
- [x] Build engineers table with columns: Name, Email, Focus Areas, Hours/wk, Available toggle
- [x] Filters: search by name/email, focus area dropdown, available-only checkbox
- [x] "Add Engineer" button opens side panel in create mode
- [x] Click table row to open side panel in edit mode (EngineerDetail component)
- [x] Form fields: name, email, GitHub URL/username, focus areas, what excites you, availability (start/hours/duration), LinkedIn, portfolio, available toggle
- [x] Inline availability checkbox toggle with optimistic UI and rollback
- [x] Create API routes: `GET+POST /api/admin/engineers`, `PATCH /api/admin/engineers/[id]`
- [x] Add "Engineers" nav link to admin layout (between Cycles and Invite)
- [x] Loading skeleton state (`loading.tsx`)

### Admin Companies Hub (`/admin/companies`)
- [x] Consolidate `/admin/invite` and `/admin/import` into `/admin/companies` with tabs (Directory | Import)
- [x] Admin nav restructured: `Cycles | Companies | Engineers | Portal` (removed Invite and Import links)
- [x] Create API routes: `GET /api/admin/companies`, `GET+PATCH /api/admin/companies/[id]`
- [x] Build CompaniesTable component (Name, Email, Stage badge, LinkedIn link, Joined date; clickable rows)
- [x] Build CompanyDetail side panel (read-only info + editable fields: name, LinkedIn, stage, newsletter opt-in)
- [x] Build AddCompanyForm side panel (invite flow — calls `POST /api/admin/invite`, shows invite link on success)
- [x] Extract CompanyImport component from import page (same CSV parse, preview, progress, results, download logic)
- [x] Main companies page with Directory/Import tabs, search + stage filter, split-pane layout
- [x] Loading skeleton state (`loading.tsx`) with tab indicators
- [x] `/admin/invite` → redirect to `/admin/companies`
- [x] `/admin/import` → redirect to `/admin/companies?tab=import`

### Admin Auth Refactor
- [x] Extract shared `verifyAdmin()` helper in `lib/admin.ts` (returns userId or NextResponse error)
- [x] Dev bypass: all admin API routes skip auth in non-production environments
- [x] Refactored all 7 admin API routes to use `verifyAdmin()` (cycles, cycles/[id], cycles/[id]/history, invite, import, engineers, engineers/[id])
- [x] Fix middleware to prioritize dev bypass over Supabase auth check
- [x] Fix admin layout to prioritize dev bypass over Supabase auth check

### Additional Features
- [x] Admin home page (`/admin` → redirects to `/admin/cycles`)
- [x] Password reset flow (`/forgot-password` + `/update-password`)
- [x] "Forgot password?" link on login page
- [x] Engineer availability dates displayed on EngineerCard (start date, hours/week, duration)
- [x] "Email Company" mailto action in admin submission detail
- [x] "View in HubSpot" link using company ID (moved to company info section)
- [x] Break week logic in dashboard week calculation
- [x] Break week logic in cohort-update email cron (skips sending during break week)
- [x] Admin Cycles: filter by engineer (dropdown)
- [x] Admin Cycles: filter by company (search)
- [x] GitHub Activity Feed: pagination / "Load more"
- [x] GitHub Activity Feed: filter by activity type
- [x] CSV Import: "Send welcome emails" option checkbox
- [x] CSV Import: "Skip duplicates silently" option checkbox
- [x] CSV Import: progress bar with percentage during import
- [x] CSV Import: "Download Results CSV" button on completion
- [x] Admin Invite: show invite link in success message (backup if email fails)
- [x] Create HubSpot custom properties (company: portal_signup_date, company_stage, portal_newsletter_optin, is_hiring, hiring_types; contact: portal_user, portal_signup_date)

### Security Fixes Applied
- [x] Auth check on `/api/auth/hubspot-sync` (was unauthenticated)
- [x] IDOR fix: hubspot-sync uses `user.id` from session, not request body
- [x] Auth check on `/api/github/feed` (was unauthenticated)
- [x] Internal key auth (`x-internal-key`) on email endpoints (welcome, feature-submitted)
- [x] Cron endpoint fails closed when `CRON_SECRET` is unset
- [x] SSRF fix: submissions route no longer reads `Origin` header for internal fetches
- [x] XSS prevention: `escapeHtml()` applied to all email templates and HubSpot notes
- [x] Input length validation on submissions (title 200, description 5000, tech_stack 500)
- [x] Input length validation on engineer profile (name 100, what_excites_you 1000)
- [x] URL format validation on engineer profile (github, linkedin, portfolio, photo URLs)
- [x] Welcome email moved server-side (removed client-side fetch from signup)

---

## Phase 6: Deployment & Infrastructure — IN PROGRESS

### Vercel Deployment
- [x] Create separate Vercel project (`fractal-partners-portal`) with root directory `portal/`
- [x] Configure environment variables (Supabase, HubSpot, GitHub, Resend, PostHog, Cron)
- [x] Fix `vercel.json` output directory for Next.js
- [x] Successful production build and deployment

### Supabase Setup
- [x] Supabase project created in Fractal org
- [x] Run `001_initial_schema.sql` migration
- [x] Run `002_cycles_and_admin.sql` migration (RLS policies, admin columns, submission history)
- [x] Create `engineer-headshots` storage bucket (public read, authenticated upload)
- [x] Set admin account (`is_admin = true`)

### Third-Party Services
- [x] Google OAuth configured (Google Cloud Console + Supabase provider)
- [x] Resend domain verified (`fractaltech.nyc`)
- [x] PostHog project created with API key
- [x] HubSpot custom properties created (company + contact)

### Pending
- [ ] Add CNAME record for `partners.fractaltech.nyc` → Vercel (need domain registrar access)
- [x] Break week set: week 7 (March 15-21, 2026) in `cohort_settings` table; cohort start updated to Feb 2, 2026
- [ ] End-to-end testing against live deployment
- [ ] Soft launch to select companies
- [ ] Public launch

---

## Key Decisions & Notes

- **Admin flag:** Using `is_admin` boolean on `profiles` table (simpler than app_metadata for V1)
- **Hours tracking:** Manual entry in V1, GitHub-based tracking deferred
- **CMS:** Spotlight + Weekly Highlights managed via Supabase Dashboard (no custom admin UI)
- **Email provider:** Resend with HTML templates (Snow White themed)
- **Analytics:** PostHog (free tier: 1M events/month)
- **GitHub feed:** Org-level API (individual OAuth deferred)
- **Engineer profiles:** Same portal, role-based access at `/engineer/profile`

---

## Blockers & Open Items

- [x] Run `002_cycles_and_admin.sql` migration on Supabase
- [x] Create `engineer-headshots` storage bucket in Supabase Dashboard
- [x] Confirm Supabase project is created in Fractal org
- [x] Confirm Google OAuth credentials are configured
- [x] Confirm Resend domain verification (fractaltech.nyc)
- [x] Confirm PostHog project created and API key set
- [ ] Confirm partners.fractaltech.nyc domain pointed to Vercel (CNAME record pending — need domain registrar access)
- [x] Break week date decided: March 15-21, 2026 (week 7)
- [x] Set your account as `is_admin = true` in profiles table
- [x] Create HubSpot custom properties
