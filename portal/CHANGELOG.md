# Changelog

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
