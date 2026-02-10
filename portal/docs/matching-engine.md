# Matching Engine — Technical Overview

The matching engine is a **two-directional system** — engineers-to-jobs and companies-to-engineers — both powered by **Claude Sonnet 4** scoring across 5 dimensions.

---

## Engineer → Job Matching

**Source:** `lib/hiring-spa/job-matching.ts`

### Stage 1: Pre-filtering (rule-based, instant)

Narrows the active job pool before any LLM calls:

- **Location filter** — keeps jobs in preferred cities + remote
- **Preference filter** — removes excluded companies, domains, locations, keywords
- **Tech stack filter** — uses an `INCOMPATIBLE_STACKS` map to prevent e.g. a React/TS engineer seeing Java/C# roles
- **Deduplication** — groups by `company_domain + normalized_title`, keeps most recent

### Stage 2: Rule-based ranking (top 20)

Counts keyword/skill matches from the engineer's DNA (top skills, languages, frameworks, best-fit signals):

```
score = 20 + (hits / totalKeywords) × 75
```

Top 20 jobs by score advance to LLM scoring.

### Stage 3: LLM scoring (parallel, concurrency = 5)

Each job is scored by Claude Sonnet across **5 dimensions** (0–100):

| Dimension       | Maps to engineer priority    |
| --------------- | ---------------------------- |
| **Mission**     | `mission_driven` rating      |
| **Technical**   | `technical_challenges` rating |
| **Culture**     | `culture` rating             |
| **Environment** | `work_life_balance` rating   |
| **DNA**         | Fixed baseline weight of 3   |

Scoring guidelines in the system prompt:

- **80+**: Genuinely strong fit
- **50–70**: Moderate fit
- **Below 40**: Poor fit

Domain expertise matters more than language overlap (e.g. TypeScript in game engine tooling ≠ TypeScript in web apps).

### Stage 4: Thresholds & final score

- **Per-dimension floor**: any dimension < 40 → reject (relaxed for sparse questionnaires on culture/environment/dna)
- **Weighted overall**: `Σ(score[d] × priority_weight[d]) / Σ(priority_weight[d])`
- **Technical floor cap**: if technical < 50, overall is capped at 50 — prevents domain-irrelevant jobs from inflating via culture/environment
- **Recency boost**: up to +5 points for jobs posted < 14 days ago, tapers linearly
- **Learned adjustments** (needs ≥3 feedback items): multipliers 0.7–1.3 per dimension based on which dimensions predicted "applied" vs "not a fit"
- **Company diversity**: max 2 jobs per company domain in the final top 10

### Stage 5: Persist

Top 10 matches upserted to `engineer_job_matches` with scores, reasoning, and highlight quotes.

---

## Company → Engineer Matching

**Source:** `lib/hiring-spa/matching.ts`

Simpler flow — no pre-filtering. Scores all `status='complete'` engineers against a role using the same 5-dimension LLM scoring, but uses the company's `dimension_weights` instead of engineer priorities. Takes top 3 matches into `hiring_spa_matches`.

---

## Ad-hoc Matching

**Source:** `lib/hiring-spa/adhoc-matching.ts`

Admin tool for one-off matching a JD URL against selected engineers. Extracts the JD (detects ATS platforms like Greenhouse/Lever/Ashby), scores each engineer, averages all 5 dimensions equally. Results stored in `adhoc_matches`.

---

## Key Constraints

| Parameter              | Value |
| ---------------------- | ----- |
| `PREFILTER_TOP_N`     | 20    |
| `TOP_N` (engineer)    | 10    |
| `TOP_N` (role)        | 3     |
| `MAX_JOBS_PER_COMPANY` | 2    |
| `MIN_DIMENSION_SCORE`  | 40   |
| `TECHNICAL_SOFT_FLOOR` | 50   |
| `SCORING_CONCURRENCY`  | 5    |
| API timeout            | 60s  |

---

## Sparse Questionnaire Handling

Engineers with < 3 questionnaire sections filled are flagged as "sparse":

1. A "Note on Data Completeness" annotation is added to the Claude prompt
2. System prompt instructs scoring 50 when no preference data exists
3. `MIN_DIMENSION_SCORE` threshold is skipped on questionnaire-dependent dimensions (culture, environment, dna)
4. Technical and mission thresholds are always enforced (data-backed from GitHub/resume)

---

## Feedback Loop

Engineers mark matches as "applied" or "not a fit" (with optional category: wrong location, wrong tech stack, company not interesting, role seniority, other).

This feedback feeds into `computeLearnedAdjustments()`:

```
For each dimension:
  appliedAvg  = avg score on matches engineer applied to
  notFitAvg   = avg score on matches engineer rejected
  adjustment  = clamp(0.7, 1 + (appliedAvg - notFitAvg) / 100 * 0.3, 1.3)
```

Dimensions that better predicted "applied" get boosted; dimensions that misled get reduced.

---

## Database Tables

### `engineer_job_matches`

Stores engineer-to-job match results: overall score, per-dimension scores, reasoning, highlight quote, display rank, batch ID, and feedback.

### `hiring_spa_matches`

Stores company-to-engineer match results: overall score, per-dimension scores, reasoning, display rank, company decision, engineer decision, and challenge response.

### `scanned_jobs`

Job postings sourced from job boards: company name/domain, title, URL, location, description, posted date, active status.

---

## API Endpoints

| Endpoint                                          | Method | Purpose                          |
| ------------------------------------------------- | ------ | -------------------------------- |
| `/api/admin/hiring-spa/engineers/[id]/matches`    | GET    | Fetch engineer's computed matches |
| `/api/admin/hiring-spa/engineers/[id]/matches`    | POST   | Compute new matches for engineer  |
| `/api/admin/hiring-spa/matches/compute`           | POST   | Compute matches for a role        |
| `/api/admin/hiring-spa/adhoc-match/score`         | POST   | Score engineers against a JD URL  |

---

## Flow Diagram

```
Engineer Profile Complete
├─ Crawl Data (GitHub, LinkedIn)
├─ Engineer DNA (AI synthesis)
├─ Questionnaire (5 sections)
├─ Profile Summary (AI-generated)
└─ Priority Ratings (1-5 sliders)
        ↓
New Jobs Available (scanned_jobs.is_active = true)
        ↓
PRE-FILTER STAGE (instant, deterministic)
├─ Location filter
├─ Preference filter (exclusions)
├─ Tech stack filter (incompatible stacks)
└─ Deduplication
        ↓
RULE-BASED RANKING (instant, no LLM)
├─ Keyword overlap scoring
└─ Top 20 candidates selected
        ↓
DETAILED LLM SCORING (parallel, Claude Sonnet)
├─ 5-dimension scoring (0-100 each)
├─ MIN_DIMENSION_SCORE threshold check
├─ Weighted overall score
├─ Recency boost
├─ Technical floor cap
└─ Learned adjustments (if feedback exists)
        ↓
RANKING & DIVERSIFICATION
├─ Sort by overall_score descending
├─ Company diversity cap (max 2 per domain)
└─ Take top 10
        ↓
PERSISTENCE → engineer_job_matches
```
