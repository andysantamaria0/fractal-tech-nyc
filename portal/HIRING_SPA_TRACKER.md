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
| **2b** Matching Engine | ⬜ Not started | Five-dimension matching, engineer cards, move forward/pass |
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
| Build verification (zero TS errors) | ⬜ | — |

---

## Phase 2b — Matching Engine ⬜

| Item | Status | Files |
|------|--------|-------|
| Migration: hiring_spa_matches table | ⬜ | — |
| Five-dimension matching engine | ⬜ | — |
| Engineer cards (collapsed/expanded) | ⬜ | — |
| Move Forward / Pass flow | ⬜ | — |
| Email notifications | ⬜ | — |

---

## Database Migrations

| # | File | Description | Applied? |
|---|------|-------------|----------|
| 009 | `009_hiring_spa_access.sql` | `has_hiring_spa_access`, `website_url`, `github_org` on profiles | ⚠️ Pending |
| 010 | `010_hiring_profiles.sql` | `hiring_profiles` table + RLS | ⚠️ Pending |
| 011 | `011_hiring_profiles_company_update.sql` | RLS UPDATE policy for companies | ⚠️ Pending |
| 012 | `012_hiring_roles.sql` | `hiring_roles` + `jd_page_views` tables + RLS | ⚠️ Pending |
| 013 | `013_dimension_raw_weights_and_jd_feedback.sql` | `dimension_weights_raw` + `jd_feedback` columns on hiring_roles | ⚠️ Pending |
| 014 | `014_engineer_profiles_spa.sql` | `engineer_profiles_spa` table + RLS (admin-only) | ⚠️ Pending |

**Note:** Migrations have not been applied to the hosted Supabase instance. They need to be run via `supabase db push` or the Supabase SQL editor before production use.

---

## Known Issues / TODOs

- [ ] Migrations 009-014 need to be applied to hosted Supabase
- [ ] Admin UI for toggling `has_hiring_spa_access` exists in company detail but depends on migration 009
- [ ] Hiring Spa layout defense-in-depth check bypassed in dev mode (production guard in place)
- [ ] No dev-mode mock profile — `/hiring-spa` shows "not started" state without a real DB profile
- [ ] `crawl_data` column stores SynthesisOutput (not raw crawl) — consider if raw content should be preserved separately for re-synthesis

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
│           └── page.tsx            # Role detail + JD editor
├── app/jd/
│   └── [slug]/
│       └── page.tsx                # Public JD page (email-gated)
├── app/api/hiring-spa/
│   ├── answers/route.ts            # POST: save answers + contradictions
│   ├── profile/route.ts            # GET: read own profile
│   ├── roles/route.ts              # GET/POST: company roles
│   └── summary/route.ts            # POST: generate summary
├── app/api/admin/hiring-spa/
│   ├── crawl/route.ts              # POST: trigger company crawl
│   ├── status/[companyId]/route.ts # GET: crawl status
│   └── engineers/
│       ├── route.ts                # GET/POST: list/create engineer profiles
│       └── [id]/
│           ├── route.ts            # GET/PATCH: get/update engineer profile
│           ├── crawl/route.ts      # POST: trigger engineer crawl
│           └── summary/route.ts    # POST: generate engineer summary
├── components/hiring-spa/
│   ├── AdaptiveQuestion.tsx
│   ├── BeautifiedJDView.tsx
│   ├── ContradictionAlert.tsx
│   ├── DimensionWeightSliders.tsx
│   ├── EmailGate.tsx
│   ├── InteractiveJDView.tsx
│   ├── ProfileSummary.tsx
│   ├── QuestionnaireForm.tsx
│   ├── QuestionSection.tsx
│   ├── RoleCard.tsx
│   ├── RoleDetailClient.tsx
│   ├── RoleSubmissionForm.tsx
│   └── TechEditor.tsx
├── lib/hiring-spa/
│   ├── beautify.ts                 # LLM JD beautification
│   ├── contradictions.ts           # LLM contradiction detection
│   ├── crawl.ts                    # Web page crawler
│   ├── discover.ts                 # URL discovery
│   ├── engineer-crawl.ts           # Engineer crawl pipeline
│   ├── engineer-questions.ts       # Engineer question definitions (5 sections)
│   ├── engineer-summary.ts         # LLM engineer summary generation
│   ├── engineer-synthesis.ts       # LLM engineer data synthesis
│   ├── github-analysis.ts          # GitHub org analysis
│   ├── jd-extract.ts               # JD URL extraction
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
    └── 014_engineer_profiles_spa.sql
```
