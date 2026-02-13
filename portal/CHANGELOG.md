# Changelog

## 2026-02-13

### Bug Fixes

- **Fix Discord notification spam** (`1841c29` in job-jr) — The Monday-only gate for scan Discord notifications was commented out for testing and never restored. Scan summaries were posting daily (7x/week) instead of Mondays only. Uncommented the weekday check. (`job-jr/src/main.py`)

- **Bump portal ingestion batch limit** (`a6ab809`) — job-jr now finds 600+ jobs per scan, exceeding the old 500-job limit on `/api/jobs/ingest`. Portal push was silently failing with a 400 error. Bumped to 1000. (`portal/app/api/jobs/ingest/route.ts`)

### Matching Quality

- **Combined re-ranking with staleness penalty** (`ce9af89`) — Previously, each weekly batch scored new jobs independently and assigned display_rank 1-10 in isolation. Old matches kept stale ranks, causing non-deterministic ordering in the engineer's match list. Now after scoring new jobs, ALL unfeedback'd matches (old + new) are combined, sorted by effective score, and assigned clean display_rank 1-10. Also stores all scored matches (not just top 10) so the re-ranking pool deepens over time. (`lib/hiring-spa/job-matching.ts`)

- **Staleness penalty for stale matches** (`ce9af89`) — Matches shown for 2+ weeks without engineer feedback now receive a gentle ranking penalty (-2 pts/week, capped at -10). Fresh high-quality jobs gradually displace ignored ones without aggressive rotation. (`lib/hiring-spa/job-matching.ts`)

### Monday Pipeline Timing (verified)

- **8:00 AM UTC** — job-jr HubSpot scan starts (finishes ~9:00 AM, pushes to portal + Discord)
- **12:00 PM UTC** — job-jr BuiltIn scrape (Monday only, pushes to portal)
- **5:00 PM UTC** — Portal match recompute cron (scores new jobs for all engineers, sends email notifications)

## 2026-02-10

### Bug Fixes

- **Fix feedback 500 error** (`e5010ea`) — Two `.single()` calls in the feedback API route threw exceptions instead of returning errors. Changed to `.maybeSingle()`. (`app/api/engineer/matches/[id]/feedback/route.ts`)

- **Fix partial preferences crash** (`dd3e958`) — `matching_preferences` existed in DB but was missing `excluded_company_domains` key, causing `.includes()` on `undefined`. Fixed by defaulting each array individually. (`app/api/engineer/matches/[id]/feedback/route.ts`)

- **Fix Ashby JD extraction** (`f32ac49`) — Ad-hoc matching against Ashby URLs only captured the job title because CSS selectors matched nothing in client-rendered HTML. Added JSON-LD extraction (`schema.org/JobPosting`) as first-pass strategy. Works for any ATS that embeds structured data. (`lib/hiring-spa/jd-extract.ts`)

- **Replace `.single()` across all engineer routes** (`5098237`) — Replaced every remaining `.single()` with `.maybeSingle()` + null guards in 6 files to prevent 500 crashes on constraint violations or edge cases. (`onboard`, `apply`, `apply/answers`, `profile`, `questionnaire` routes + `job-matching.ts`)

### Matching Quality

- **Domain expertise scoring** (`e5010ea`) — Added prompt guideline: shared programming languages alone don't make a technical match. Claude now scores below 40 when the core domain is outside the engineer's experience. (`lib/hiring-spa/job-matching.ts`)

- **Technical floor cap** (`ad4c555`) — If technical score < 50, overall score is capped at 50%. Prevents domain-irrelevant jobs from inflating via strong culture/environment/dna dimensions. (`lib/hiring-spa/job-matching.ts`)

### Documentation

- **Updated CLAUDE.md** (`ffb5246`) — Documented technical floor cap and domain-expertise prompt in matching system reference and troubleshooting section.
