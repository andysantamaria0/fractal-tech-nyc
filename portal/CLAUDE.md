# Portal — Agent Reference

## CRITICAL: Engineer Subdomain Auth Flow

**This is the #1 UX rule for this codebase. Violating it is unacceptable.**

### The Rule

Any user on `eng.fractaltech.nyc` must NEVER see any company page. Not `/login`, not `/complete-profile`, not `/dashboard`, not `/signup`. NEVER. They must only ever see `/engineer/*` routes.

### Why This Breaks

Supabase magic links redirect through Supabase's auth server to the project's **Site URL** (`partners.fractaltech.nyc`), NOT the subdomain the user was on (`eng.fractaltech.nyc`). This means:

1. Engineer visits `eng.fractaltech.nyc` → gets `/engineer/login`
2. Enters email → magic link sent with `emailRedirectTo: https://eng.fractaltech.nyc/callback?next=/engineer/onboard`
3. Supabase sends email with link to `https://<project>.supabase.co/auth/v1/verify?...&redirect_to=https://eng.fractaltech.nyc/callback?next=/engineer/onboard`
4. **BUT** if `eng.fractaltech.nyc` is not in Supabase's Redirect URLs, Supabase strips it and redirects to the Site URL instead
5. User lands on `partners.fractaltech.nyc/callback` **WITHOUT** the `?next=/engineer/onboard` parameter
6. Callback defaults `next` to `/dashboard`, engineer detection branch is skipped
7. New user (no profiles row) gets sent to `/complete-profile` — the COMPANY setup page

### The Defenses (multi-layered, do NOT remove any)

1. **Server-side login intent** (`engineer_login_intents` table + `app/api/engineer/mark-flow/route.ts`): When the engineer login page sends a magic link, it also writes the user's email to the `engineer_login_intents` table. The callback checks this table. This is the PRIMARY defense — it works across browsers, devices, and subdomains. Cleaned up after use.

1b. **Cross-subdomain cookie** (backup): The engineer login page also sets `x-engineer-flow=1` cookie on `.fractaltech.nyc` domain. Works in same-browser flows even if the DB write fails.

2. **Middleware hard guard** (`middleware.ts`): If `host.startsWith('eng.')`, redirect ALL company pages (`/`, `/login`, `/signup`, `/complete-profile`, `/dashboard`, `/cycles/*`, `/settings/*`, `/hiring-spa/*`) to engineer equivalents. This runs BEFORE any auth logic.

3. **Callback route fallback** (`app/(auth)/callback/route.ts`): If user has no engineer record AND no profiles record, redirect to `/engineer/onboard` (not `/complete-profile`). Rationale: company users ALWAYS have a profiles row created by admin invite. A profileless user is always an engineer. NOTE: This fallback can be defeated if the bug previously ran and created a stale profiles row — that's why the cookie (defense #1) exists.

4. **Middleware auth-page redirect** (`middleware.ts` line ~182): Authenticated user on `/engineer/login` with no engineer record → `/engineer/onboard`.

### Why the profiles table is NOT a reliable signal

The bug itself creates stale `profiles` rows. When an engineer gets redirected to `/complete-profile` and fills out the form, a `profiles` row is created. This row then permanently defeats any "no profile = engineer" check. The cookie is the only reliable signal because it's set BEFORE the magic link is sent, not after.

### When Modifying Auth Flow

- ALWAYS test with a brand-new email on `eng.fractaltech.nyc`
- Verify the user sees `/engineer/onboard`, NOT `/complete-profile`
- Check that the `?next=` parameter survives the Supabase redirect (it often doesn't — that's why we have the fallback)
- NEVER assume `next` parameter will be present in the callback
- NEVER use the `profiles` table as a signal for "is this a company user" — the bug creates stale profiles rows
- The `x-engineer-flow` cookie on `.fractaltech.nyc` is the source of truth — do NOT remove it

## Engineer Job Matching System

### How Matching Works
1. Engineer completes questionnaire (5 text sections + priority sliders + locations)
2. `computeMatchesForEngineer()` in `lib/hiring-spa/job-matching.ts` runs:
   - Pre-filters: location, tech stack compatibility, exclusion preferences, deduplication
   - Rule-based keyword pre-filter selects top 20 candidates
   - Claude Sonnet scores each candidate across 5 dimensions (0-100): mission, technical, culture, environment, dna
   - Weighted score computed using engineer's priority_ratings sliders
   - Per-dimension minimum threshold (MIN_DIMENSION_SCORE = 40) rejects poor fits
   - Top 10 matches (max 2 per company) stored in `engineer_job_matches`

### Sparse Questionnaire Data (Feb 2026)
**Problem:** Engineers who submit with empty text fields (only sliders + locations) got 0 matches because Claude scored culture/environment/dna conservatively (~20-35) and the MIN_DIMENSION_SCORE=40 threshold rejected everything.

**Fix (commits cdfe531..f9aea3d):**
- `getQuestionnaireCompleteness()` detects sparse profiles (< 3 of 5 sections filled)
- SYSTEM_PROMPT instructs Claude to score 50 (neutral) when no preference data exists
- User prompt annotated with "Note on Data Completeness" for sparse profiles
- MIN_DIMENSION_SCORE threshold skipped on questionnaire-dependent dimensions (culture, environment, dna) for sparse profiles; always enforced on technical and mission
- Client-side + server-side validation now requires >= 1 non-empty answer per section

**Key files:**
| File | What it does |
|------|-------------|
| `lib/hiring-spa/job-matching.ts` | Matching algorithm, scoring, thresholds |
| `lib/hiring-spa/engineer-summary.ts` | AI profile summary generation |
| `components/engineer/EngineerQuestionnaireForm.tsx` | Questionnaire UI + client validation |
| `app/api/engineer/questionnaire/route.ts` | Questionnaire save + server validation |
| `app/api/admin/hiring-spa/engineers/[id]/matches/route.ts` | Admin API: fetch + compute matches |
| `app/admin/hiring-spa/engineers/[id]/matches/page.tsx` | Admin UI: match scores + expandable reasoning |

**If matches break:**
- Check `MIN_DIMENSION_SCORE` (line ~20) — lowering it = more matches, raising = fewer
- Check `PREFILTER_TOP_N` (line ~24) — controls how many jobs reach Claude scoring
- Sparse detection threshold is `filled < 3` in `getQuestionnaireCompleteness()`
- Questionnaire-dependent dimensions list: culture, environment, dna
- The SYSTEM_PROMPT "score 50 when no data" guideline affects all scoring, not just sparse profiles

## Architecture Notes

### Subdomain Routing
- `eng.fractaltech.nyc` — Engineer-facing portal
- `partners.fractaltech.nyc` — Company/partner-facing portal
- Both served by the same Next.js app; middleware differentiates by `host` header

### Auth Flow
- Supabase magic link OTP (PKCE flow)
- Callback at `/callback` exchanges code for session
- Middleware handles redirects based on user type (engineer vs company)
- Engineers table: `engineers` (checked by `auth_user_id` then `email`)
- Company users table: `profiles` (always created by admin invite)

### Key Files
- `middleware.ts` — All routing/redirect logic
- `app/(auth)/callback/route.ts` — Post-auth routing decisions
- `app/engineer/login/page.tsx` — Engineer magic link entry point
- `lib/api/admin-helpers.ts` — `withAdmin()` wrapper for admin API routes
