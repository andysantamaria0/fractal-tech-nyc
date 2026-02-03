# Hiring Spa — Project Tracker

**Last updated:** February 2, 2026
**PRD:** `fractal-hiring-spa-prd.md`

---

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| **1a** Intelligence Layer | ✅ Complete | Crawl pipeline, synthesis, admin API |
| **1b** Company Hiring Profile | ✅ Complete | Questionnaire, contradictions, summary, design system |
| **1c** JD Beautification | ⬜ Not started | Role submission, JD beautification, public JD page |
| **2** Matching | ⬜ Not started | Engineer profiling, 5-dimension matching engine |
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

## Phase 1c — JD Beautification ⬜

| Item | Status | Files |
|------|--------|-------|
| Migration: hiring_roles table | ⬜ | `supabase/migrations/012_*.sql` |
| Migration: jd_page_views table | ⬜ | `supabase/migrations/013_*.sql` |
| JD URL extraction | ⬜ | `lib/hiring-spa/jd-extract.ts` |
| JD beautification (LLM) | ⬜ | `lib/hiring-spa/beautify.ts` |
| API: submit role | ⬜ | `app/api/hiring-spa/roles/route.ts` |
| API: beautify JD | ⬜ | `app/api/hiring-spa/roles/beautify/route.ts` |
| Page: /hiring-spa/roles | ⬜ | `app/(portal)/hiring-spa/roles/page.tsx` |
| Page: /hiring-spa/roles/new | ⬜ | `app/(portal)/hiring-spa/roles/new/page.tsx` |
| Page: /hiring-spa/roles/[id] | ⬜ | `app/(portal)/hiring-spa/roles/[id]/page.tsx` |
| Page: /jd/[slug] (public) | ⬜ | `app/jd/[slug]/page.tsx` |
| Dimension weight UI | ⬜ | — |
| Requirement weight/caveat editor | ⬜ | — |

---

## Phase 2 — Matching ⬜

| Item | Status | Files |
|------|--------|-------|
| Migration: engineer_profiles_spa table | ⬜ | — |
| Migration: hiring_spa_matches table | ⬜ | — |
| Engineer profiling pipeline | ⬜ | — |
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

**Note:** Migrations have not been applied to the hosted Supabase instance. They need to be run via `supabase db push` or the Supabase SQL editor before production use.

---

## Known Issues / TODOs

- [ ] Migrations 009-011 need to be applied to hosted Supabase
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
│   └── profile/
│       └── page.tsx                # Questionnaire page
├── app/api/hiring-spa/
│   ├── answers/route.ts            # POST: save answers + contradictions
│   ├── profile/route.ts            # GET: read own profile
│   └── summary/route.ts            # POST: generate summary
├── app/api/admin/hiring-spa/
│   ├── crawl/route.ts              # POST: trigger crawl
│   └── status/[companyId]/route.ts # GET: crawl status
├── components/hiring-spa/
│   ├── AdaptiveQuestion.tsx
│   ├── ContradictionAlert.tsx
│   ├── ProfileSummary.tsx
│   ├── QuestionnaireForm.tsx
│   ├── QuestionSection.tsx
│   └── TechEditor.tsx
├── lib/hiring-spa/
│   ├── contradictions.ts           # LLM contradiction detection
│   ├── crawl.ts                    # Web page crawler
│   ├── discover.ts                 # URL discovery
│   ├── github-analysis.ts          # GitHub org analysis
│   ├── pipeline.ts                 # Crawl pipeline orchestrator
│   ├── questions.ts                # Question definitions + prefill
│   ├── summary.ts                  # LLM profile summary generation
│   ├── synthesize.ts               # LLM crawl data synthesis
│   └── types.ts                    # All Hiring Spa types
└── supabase/migrations/
    ├── 009_hiring_spa_access.sql
    ├── 010_hiring_profiles.sql
    └── 011_hiring_profiles_company_update.sql
```
