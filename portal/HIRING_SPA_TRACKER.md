# Hiring Spa — Project Tracker

**Last updated:** February 3, 2026
**PRD:** `fractal-hiring-spa-prd.md`

---

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| **1a** Intelligence Layer | ✅ Complete | Crawl pipeline, synthesis, admin API |
| **1b** Company Hiring Profile | ✅ Complete | Questionnaire, contradictions, summary, design system |
| **1c** JD Beautification | ✅ Complete | Role submission, JD beautification, public JD page |
| **2a** Engineer Profiles | ✅ Complete | Engineer crawl, synthesis, questionnaire, summary, admin API |
| **2b** Matching Engine | ✅ Complete | Five-dimension matching, engineer cards, move forward/pass, challenge flow |
| **3** Integration & Scale | ⬜ Not started | ATS APIs, challenges, automation |
| **4** Refinement | ⬜ Not started | Analytics, feedback loops, optimization |

---

## Phase 1a — Intelligence Layer ✅

| Item | Status | Files |
|------|--------|-------|
| Web crawler | ✅ | `lib/hiring-spa/crawl.ts` |
| URL discovery | ✅ | `lib/hiring-spa/discover.ts` |
| GitHub org analysis | ✅ | `lib/hiring-spa/github-analysis.ts` |
| LLM synthesis | ✅ | `lib/hiring-spa/synthesize.ts` |
| Pipeline orchestrator | ✅ | `lib/hiring-spa/pipeline.ts` |
| Admin crawl API | ✅ | `app/api/admin/hiring-spa/crawl/route.ts` |
| Admin status API | ✅ | `app/api/admin/hiring-spa/status/[companyId]/route.ts` |
| Company profile read API | ✅ | `app/api/hiring-spa/profile/route.ts` |
| Types | ✅ | `lib/hiring-spa/types.ts` |
| Migration: hiring_profiles table | ✅ | `supabase/migrations/010_hiring_profiles.sql` |
| Migration: access flag + URL fields | ✅ | `supabase/migrations/009_hiring_spa_access.sql` |

---

## Phase 1b — Company Hiring Profile ✅

| Item | Status | Files |
|------|--------|-------|
| Migration: RLS UPDATE policy | ✅ | `supabase/migrations/011_hiring_profiles_company_update.sql` |
| Types: answers, contradictions, summary | ✅ | `lib/hiring-spa/types.ts` |
| Design system CSS (scoped) | ✅ | `app/(portal)/hiring-spa/hiring-spa.css` |
| Access gate: middleware | ✅ | `middleware.ts` |
| Access gate: Header nav link | ✅ | `components/Header.tsx` |
| Access gate: portal layout | ✅ | `app/(portal)/layout.tsx` |
| Access gate: hiring-spa layout | ✅ | `app/(portal)/hiring-spa/layout.tsx` |
| Question definitions | ✅ | `lib/hiring-spa/questions.ts` |
| Contradiction detection (LLM) | ✅ | `lib/hiring-spa/contradictions.ts` |
| Summary generation (LLM) | ✅ | `lib/hiring-spa/summary.ts` |
| API: save answers | ✅ | `app/api/hiring-spa/answers/route.ts` |
| API: generate summary | ✅ | `app/api/hiring-spa/summary/route.ts` |
| Component: AdaptiveQuestion | ✅ | `components/hiring-spa/AdaptiveQuestion.tsx` |
| Component: QuestionSection | ✅ | `components/hiring-spa/QuestionSection.tsx` |
| Component: ContradictionAlert | ✅ | `components/hiring-spa/ContradictionAlert.tsx` |
| Component: TechEditor | ✅ | `components/hiring-spa/TechEditor.tsx` |
| Component: ProfileSummary | ✅ | `components/hiring-spa/ProfileSummary.tsx` |
| Component: QuestionnaireForm | ✅ | `components/hiring-spa/QuestionnaireForm.tsx` |
| Page: /hiring-spa (portal home) | ✅ | `app/(portal)/hiring-spa/page.tsx` |
| Page: /hiring-spa/profile (questionnaire) | ✅ | `app/(portal)/hiring-spa/profile/page.tsx` |
| Build verification (zero TS errors) | ✅ | — |

---

## Phase 1c — JD Beautification ✅

| Item | Status | Files |
|------|--------|-------|
| Migration: hiring_roles table | ✅ | `supabase/migrations/012_hiring_roles.sql` |
| Migration: dimension_weights_raw + jd_feedback | ✅ | `supabase/migrations/013_dimension_raw_weights_and_jd_feedback.sql` |
| Types: roles, JD feedback, dimension weights | ✅ | `lib/hiring-spa/types.ts` |
| JD URL extraction | ✅ | `lib/hiring-spa/jd-extract.ts` |
| JD beautification (LLM) | ✅ | `lib/hiring-spa/beautify.ts` |
| API: submit role | ✅ | `app/api/hiring-spa/roles/route.ts` |
| API: role detail/update | ✅ | `app/api/hiring-spa/roles/[id]/route.ts` |
| API: beautify JD | ✅ | `app/api/hiring-spa/roles/beautify/route.ts` |
| Page: /hiring-spa/roles | ✅ | `app/(portal)/hiring-spa/roles/page.tsx` |
| Page: /hiring-spa/roles/new | ✅ | `app/(portal)/hiring-spa/roles/new/page.tsx` |
| Page: /hiring-spa/roles/[id] | ✅ | `app/(portal)/hiring-spa/roles/[id]/page.tsx` |
| Page: /jd/[slug] (public) | ✅ | `app/jd/[slug]/page.tsx` |
| Component: RoleCard | ✅ | `components/hiring-spa/RoleCard.tsx` |
| Component: RoleDetailClient | ✅ | `components/hiring-spa/RoleDetailClient.tsx` |
| Component: RoleSubmissionForm | ✅ | `components/hiring-spa/RoleSubmissionForm.tsx` |
| Component: BeautifiedJDView | ✅ | `components/hiring-spa/BeautifiedJDView.tsx` |
| Component: InteractiveJDView | ✅ | `components/hiring-spa/InteractiveJDView.tsx` |
| Component: DimensionWeightSliders | ✅ | `components/hiring-spa/DimensionWeightSliders.tsx` |
| Component: EmailGate | ✅ | `components/hiring-spa/EmailGate.tsx` |

---

## Phase 2a — Engineer Profiles ✅

| Item | Status | Files |
|------|--------|-------|
| Migration: engineer_profiles_spa table | ✅ | `supabase/migrations/014_engineer_profiles_spa.sql` |
| Types: engineer profile, DNA, questionnaire, summary | ✅ | `lib/hiring-spa/types.ts` |
| Engineer crawl pipeline | ✅ | `lib/hiring-spa/engineer-crawl.ts` |
| Engineer LLM synthesis | ✅ | `lib/hiring-spa/engineer-synthesis.ts` |
| Engineer question definitions (5 sections) | ✅ | `lib/hiring-spa/engineer-questions.ts` |
| Engineer summary generation (LLM) | ✅ | `lib/hiring-spa/engineer-summary.ts` |
| Admin API: list/create engineers | ✅ | `app/api/admin/hiring-spa/engineers/route.ts` |
| Admin API: get/update engineer | ✅ | `app/api/admin/hiring-spa/engineers/[id]/route.ts` |
| Admin API: trigger crawl | ✅ | `app/api/admin/hiring-spa/engineers/[id]/crawl/route.ts` |
| Admin API: generate summary | ✅ | `app/api/admin/hiring-spa/engineers/[id]/summary/route.ts` |
| Build verification (zero TS errors) | ✅ | — |

---

## Phase 2b — Matching Engine ✅

| Item | Status | Files |
|------|--------|-------|
| Migration: hiring_spa_matches table | ✅ | `supabase/migrations/015_hiring_spa_matches.sql` |
| Migration: challenge response columns + unique index | ✅ | `supabase/migrations/016_match_challenge_response.sql` |
| Five-dimension matching engine (LLM scoring) | ✅ | `lib/hiring-spa/matching.ts` |
| Auto-trigger matching after beautification | ✅ | `app/api/hiring-spa/roles/beautify/route.ts` |
| Auto-trigger matching after weight changes | ✅ | `app/api/hiring-spa/roles/[id]/route.ts` |
| Admin API: list matches | ✅ | `app/api/admin/hiring-spa/matches/route.ts` |
| Admin API: trigger match compute | ✅ | `app/api/admin/hiring-spa/matches/compute/route.ts` |
| Company API: list matches for role | ✅ | `app/api/hiring-spa/matches/route.ts` |
| Company API: record decision (move forward / pass) | ✅ | `app/api/hiring-spa/matches/[id]/decision/route.ts` |
| Move-forward email notification to Fractal | ✅ | `lib/hiring-spa/notifications.ts`, `emails/match-moved-forward.tsx` |
| Component: EngineerMatchCard (collapsed/expanded) | ✅ | `components/hiring-spa/EngineerMatchCard.tsx` |
| Match display in role detail page | ✅ | `components/hiring-spa/RoleDetailClient.tsx` |
| Public JD: match percentage banner | ✅ | `app/jd/[slug]/page.tsx` |
| Public JD: challenge accept/decline UI | ✅ | `app/jd/[slug]/page.tsx` |
| API: public JD view with match data | ✅ | `app/api/jd/view/route.ts` |
| API: public JD metadata | ✅ | `app/api/jd/[slug]/route.ts` |
| API: challenge response (accept/decline) | ✅ | `app/api/jd/challenge-response/route.ts` |
| Types: match, challenge response | ✅ | `lib/hiring-spa/types.ts` |
| CSS: match banner + challenge card | ✅ | `app/jd/jd-public.css` |
| Build verification (zero TS errors) | ✅ | — |

---

## Database Migrations

| # | File | Description | Applied? |
|---|------|-------------|----------|
| 009 | `009_hiring_spa_access.sql` | `has_hiring_spa_access`, `website_url`, `github_org` on profiles | ✅ Applied |
| 010 | `010_hiring_profiles.sql` | `hiring_profiles` table + RLS | ✅ Applied |
| 011 | `011_hiring_profiles_company_update.sql` | RLS UPDATE policy for companies | ✅ Applied |
| 012 | `012_hiring_roles.sql` | `hiring_roles` + `jd_page_views` tables + RLS | ✅ Applied |
| 013 | `013_dimension_raw_weights_and_jd_feedback.sql` | `dimension_weights_raw` + `jd_feedback` columns on hiring_roles | ✅ Applied |
| 014 | `014_engineer_profiles_spa.sql` | `engineer_profiles_spa` table + RLS (admin-only) | ✅ Applied |
| 015 | `015_hiring_spa_matches.sql` | `hiring_spa_matches` table + dimension key rename + RLS | ✅ Applied |
| 016 | `016_match_challenge_response.sql` | `challenge_response` columns + unique index on (role_id, engineer_id) | ✅ Applied |

---

## Local Dev Setup

To run the full Hiring Spa locally:

1. **Docker Desktop** must be running
2. `cd portal && npx supabase start` — starts local Postgres + auth + all services, applies all migrations
3. Generate JWT keys from the local JWT secret (`super-secret-jwt-token-with-at-least-32-characters-long`):
   ```bash
   node -e '
   const crypto = require("crypto");
   function base64url(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
   function sign(payload, secret) { const h = {alg:"HS256",typ:"JWT"}; const d = base64url(h)+"."+base64url(payload); return d+"."+crypto.createHmac("sha256",secret).update(d).digest("base64url"); }
   const s = "super-secret-jwt-token-with-at-least-32-characters-long", n = Math.floor(Date.now()/1000), e = n+315360000;
   console.log("ANON=" + sign({role:"anon",iss:"supabase",iat:n,exp:e},s));
   console.log("SERVICE=" + sign({role:"service_role",iss:"supabase",iat:n,exp:e},s));
   '
   ```
4. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON key from step 3>"
   SUPABASE_SERVICE_ROLE_KEY="<SERVICE key from step 3>"
   ```
5. Seed test admin user:
   ```bash
   docker exec -i supabase_db_portal psql -U postgres -d postgres -c "
   INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
   VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@test.com',crypt('password123',gen_salt('bf')),NOW(),NOW(),NOW(),'','')
   ON CONFLICT (id) DO NOTHING;
   INSERT INTO profiles (id, email, name, is_admin, has_hiring_spa_access, website_url, github_org)
   VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','admin@test.com','Test Admin',true,true,'https://fractalbootcamp.com','fractal-bootcamp')
   ON CONFLICT (id) DO UPDATE SET is_admin=true, has_hiring_spa_access=true;
   INSERT INTO hiring_profiles (company_id, status, company_dna, technical_environment)
   VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','complete',
     '{\"mission\":\"Train the next generation of software engineers\",\"values\":[\"craft\",\"intensity\",\"community\"],\"culture\":\"High-intensity bootcamp with strong peer support\",\"workStyle\":\"In-person, full-time immersive\",\"fundingStage\":\"Seed\",\"teamSize\":\"10-20\",\"industry\":\"EdTech\"}'::jsonb,
     '{\"primaryLanguages\":[\"TypeScript\",\"Python\"],\"frameworks\":[\"Next.js\",\"React\",\"Node.js\"],\"infrastructure\":[\"Vercel\",\"Supabase\",\"AWS\"],\"devPractices\":[\"Code review\",\"Pair programming\",\"CI/CD\"],\"openSourceInvolvement\":\"Active - multiple public repos\"}'::jsonb
   ) ON CONFLICT (company_id) DO NOTHING;"
   ```
6. `npm run dev` — login at http://localhost:3000/login with `admin@test.com` / `password123`

**Note:** The newer Supabase CLI outputs `sb_publishable_` / `sb_secret_` keys which don't work with `@supabase/ssr`. You must generate JWT-format keys as shown in step 3.

---

## Known Issues / TODOs

- [ ] Admin UI for toggling `has_hiring_spa_access` exists in company detail but depends on migration 009
- [ ] Hiring Spa layout defense-in-depth check bypassed in dev mode (production guard in place)
- [ ] `crawl_data` column stores SynthesisOutput (not raw crawl) — consider if raw content should be preserved separately for re-synthesis
- [ ] Phase 1c JD flow needs end-to-end manual testing (submit JD → beautify → confirm weights → publish)
- [ ] Phase 2a engineer pipeline needs end-to-end testing (create → crawl → questionnaire → summary)
- [ ] Phase 2b matching needs end-to-end testing (beautify role → auto-match → view matches → move forward → notification)
- [ ] Phase 2b challenge flow needs testing (engineer views JD → sees match % → accepts challenge → recorded in DB)
- [ ] No company email notification when new matches are available (move-forward notification to Fractal team works)

---

## File Index

```
portal/
├── app/(portal)/hiring-spa/
│   ├── hiring-spa.css              # Scoped design system
│   ├── layout.tsx                  # Access gate + CSS scope wrapper
│   ├── page.tsx                    # Portal home (status-based)
│   ├── profile/
│   │   └── page.tsx                # Questionnaire page
│   └── roles/
│       ├── page.tsx                # Roles list
│       ├── new/
│       │   └── page.tsx            # New role submission
│       └── [id]/
│           └── page.tsx            # Role detail + JD editor + matches
├── app/jd/
│   ├── jd-public.css               # Public JD page styles (match banner, challenge card)
│   └── [slug]/
│       ├── layout.tsx              # Public JD layout (jd-public + hiring-spa scope)
│       └── page.tsx                # Public JD page (email-gated, match %, challenge UI)
├── app/api/hiring-spa/
│   ├── answers/route.ts            # POST: save answers + contradictions
│   ├── profile/route.ts            # GET: read own profile
│   ├── roles/
│   │   ├── route.ts                # GET/POST: company roles
│   │   ├── [id]/route.ts           # GET/PATCH: role detail/update + auto-trigger matching
│   │   └── beautify/route.ts       # POST: beautify JD + auto-trigger matching
│   ├── matches/
│   │   ├── route.ts                # GET: list matches for a role
│   │   └── [id]/
│   │       └── decision/route.ts   # POST: move forward / pass on a match
│   └── summary/route.ts            # POST: generate summary
├── app/api/jd/
│   ├── [slug]/route.ts             # GET: public JD metadata (title, company name)
│   ├── view/route.ts               # POST: email-gated JD view (returns JD + match + challenge)
│   └── challenge-response/route.ts # POST: engineer challenge accept/decline
├── app/api/admin/hiring-spa/
│   ├── crawl/route.ts              # POST: trigger company crawl
│   ├── status/[companyId]/route.ts # GET: crawl status
│   ├── engineers/
│   │   ├── route.ts                # GET/POST: list/create engineer profiles
│   │   └── [id]/
│   │       ├── route.ts            # GET/PATCH: get/update engineer profile
│   │       ├── crawl/route.ts      # POST: trigger engineer crawl
│   │       └── summary/route.ts    # POST: generate engineer summary
│   └── matches/
│       ├── route.ts                # GET: admin list all matches
│       └── compute/route.ts        # POST: admin trigger match computation
├── components/hiring-spa/
│   ├── AdaptiveQuestion.tsx
│   ├── BeautifiedJDView.tsx
│   ├── ContradictionAlert.tsx
│   ├── DimensionWeightSliders.tsx
│   ├── EmailGate.tsx
│   ├── EngineerMatchCard.tsx
│   ├── InteractiveJDView.tsx
│   ├── ProfileSummary.tsx
│   ├── QuestionnaireForm.tsx
│   ├── QuestionSection.tsx
│   ├── RoleCard.tsx
│   ├── RoleDetailClient.tsx
│   ├── RoleSubmissionForm.tsx
│   └── TechEditor.tsx
├── emails/
│   └── match-moved-forward.tsx     # Email template: move-forward notification to Fractal
├── lib/hiring-spa/
│   ├── beautify.ts                 # LLM JD beautification
│   ├── contradictions.ts           # LLM contradiction detection
│   ├── crawl.ts                    # Web page crawler
│   ├── discover.ts                 # URL discovery
│   ├── engineer-crawl.ts           # Engineer crawl pipeline
│   ├── engineer-questions.ts       # Engineer question definitions (5 sections)
│   ├── engineer-summary.ts         # LLM engineer summary generation
│   ├── engineer-synthesis.ts       # LLM engineer data synthesis
│   ├── github-analysis.ts          # GitHub org/user analysis
│   ├── jd-extract.ts               # JD URL extraction
│   ├── matching.ts                 # Five-dimension LLM matching engine
│   ├── notifications.ts            # Move-forward email notification
│   ├── pipeline.ts                 # Company crawl pipeline orchestrator
│   ├── questions.ts                # Company question definitions + prefill
│   ├── summary.ts                  # LLM company profile summary generation
│   ├── synthesize.ts               # LLM company crawl data synthesis
│   └── types.ts                    # All Hiring Spa types
└── supabase/migrations/
    ├── 009_hiring_spa_access.sql
    ├── 010_hiring_profiles.sql
    ├── 011_hiring_profiles_company_update.sql
    ├── 012_hiring_roles.sql
    ├── 013_dimension_raw_weights_and_jd_feedback.sql
    ├── 014_engineer_profiles_spa.sql
    ├── 015_hiring_spa_matches.sql
    └── 016_match_challenge_response.sql
```
