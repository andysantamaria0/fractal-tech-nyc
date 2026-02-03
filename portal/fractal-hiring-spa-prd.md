# Fractal Hiring Spa — Product Requirements Document

**Version:** 1.4
**Date:** February 3, 2026
**Owner:** Andy Santamaria
**Status:** Phase 1a + 1b + 1c + 2a + 2b + 3-core implemented

---

## 1. Product Vision

**Tagline:** The calmest ten minutes of your workday.

Fractal Hiring Spa is a hiring platform for software engineers that replaces the anxiety, noise, and busywork of traditional recruiting with a curated, transparent, and genuinely relaxing experience — for both companies and engineers.

The product delivers on a single promise: a hiring manager logs in, spends ten minutes or less, sees high-quality engineer matches with real signal (not resume keywords), and leaves. No dashboards to manage, no pipelines to maintain, no sourcing. Just matches that matter.

**Core thesis:** Remove the fatigue of choice with the feature of trust.

**Design North Star:** The Aman Hotel Spa NYC meets the Snow White Macintosh. Sanctuary-like calm fused with friendly precision. Warm materials (honey, stone, parchment) with monospaced system typography and clean hierarchy. The interface actively discourages rushing.

---

## 2. Problem Statement

Hiring software engineers is broken on both sides.

**For companies:** The process is noisy, time-consuming, and unreliable. Job descriptions are generic wish lists. Screening is shallow. Hiring managers spend hours in ATS dashboards sifting through applications with no real signal about fit. Cultural alignment — the thing that actually predicts success — is an afterthought.

**For engineers:** The process is opaque and exhausting. They apply into black boxes, repeat the same information across dozens of forms, and rarely get honest signal about whether a role actually fits who they are and how they work.

**What's missing:** A system that deeply understands both sides — company DNA, team culture, role nuance, engineer identity — and matches them with transparency and care. A system that does the homework before asking anyone a single question.

---

## 3. Users

### 3.1 Company User (Hiring Manager / Founder)

Already has an account on the Fractal partners portal (`profiles` table). Must be explicitly granted Hiring Spa access (see Section 4). Busy, skeptical of recruiting tools, wants signal without effort. Cares deeply about culture fit but has never had a tool that actually captures it.

### 3.2 Engineer

Software engineers at various career stages. They do not have a portal or login — they are invited into the system when matched. They receive an email with a link to the company's beautified JD. They want transparency about what a role actually involves, who the team is, and whether the culture genuinely fits them.

---

## 4. Access & Invitation Model

The Hiring Spa is a hidden, invite-only product within the existing partners portal at `partners.fractaltech.nyc`. Having a company account does not grant Hiring Spa access.

### 4.1 Gating Mechanism

A boolean flag `has_hiring_spa_access` on the existing `profiles` table. Default: `false`.

- **Granting access:** Admin sets the flag to `true` via the admin panel or directly in Supabase.
- **Revoking access:** Admin sets the flag to `false`.
- **UI behavior:** Hiring Spa routes, navigation items, and all related UI are hidden for users without access. Attempting to access a Hiring Spa route directly without access redirects to `/dashboard`.
- **Middleware:** Server-side check on all `/hiring-spa/*` routes. Query the `profiles` table for the authenticated user's `has_hiring_spa_access` flag. `/engineer/apply` is explicitly exempted from auth to allow public self-signup while keeping other `/engineer/*` routes protected.

### 4.2 Admin Management

- Admin panel (`/admin/companies`) gets a "Hiring Spa Access" toggle per company, similar to the existing `is_available_for_cycles` toggle on engineers.
- No self-service request flow. Access is granted by Fractal.

---

## 5. Product Model

The Hiring Spa operates in three phases:

**Phase A — Company Profiling ("The Intake"):** Build a deep, intelligent profile of the company's DNA, culture, and what makes their best people thrive. This is the spa questionnaire before the treatment begins.

**Phase B — Role Submission & JD Beautification ("The Treatment"):** Transform generic job descriptions into honest, nuanced role profiles that capture what actually matters. Add caveats, weights, team context, and optional technical challenges.

**Phase C — Matching & Presentation ("The Result"):** Match profiled engineers to beautified roles across multiple dimensions. Present three curated matches per role. Company user reviews, moves forward, or passes. Ten minutes or less.

---

## 6. Detailed Feature Specifications

### 6.1 Company Hiring Profile

#### 6.1.1 Intelligence Layer (Automated Crawling Pipeline)

Before the company user answers a single question, the system has already done its homework. This is a fully automated pipeline, not a manual process.

**Data sources crawled:**

| Source | What we extract |
|--------|----------------|
| Company website (all pages) | Mission, values, team descriptions, product language, tone of voice |
| LinkedIn company page | Recent posts, employee highlights, growth signals, stated culture values |
| Social media (Twitter/X, blog) | Personality, priorities, communication style |
| Public GitHub (if exists) | Repo activity, open source contributions, tech stack signals, engineering culture indicators |
| Review signals (Glassdoor, etc.) | Handled carefully — presented as context, not judgment |

**Pipeline architecture:**

1. **Crawl:** Fetch and extract text content from all discoverable pages. Store raw content.
2. **Synthesize:** LLM processes all crawled content into a structured draft hiring profile — company DNA snapshot, inferred culture traits, technical environment, working style signals.
3. **Present:** Draft profile shown to the company user as the starting point of their form journey. Pre-filled fields, not a blank page.

**Inputs:** The company's website URL is known from their `company_linkedin` field on the `profiles` table. Additional URLs (website, GitHub org, Twitter) can be provided during onboarding or pulled from LinkedIn.

#### 6.1.2 Guided Questionnaire

The form journey refines the draft profile. Questions are adaptive — if the pre-populated data already covers an area well, the question is lighter or pre-filled.

**Culture & DNA:**
- What do your most successful employees have in common?
- What do employees who love working here say about why they stay?
- What attributes are notable and common among your best people?
- What's the honest working style? (Async-first? In-office energy? Hybrid?)
- What doesn't work here? What kind of person would struggle?

**Mission & Values:**
- What is the company actually trying to accomplish? (Their words, not the marketing version.)
- What trade-offs has the company made that reveal what it values most?

**Team Dynamics:**
- How do teams communicate day-to-day?
- Decision-making style? (Top-down, consensus, ownership-driven?)
- How is conflict handled?

**Technical Environment:**
- Stack and infrastructure (pre-populated from intelligence layer).
- Engineering practices — code review culture, shipping cadence, testing philosophy.
- Technical debt posture — honest assessment.

#### 6.1.3 Contradiction Detection (LLM-Powered)

During the profiling flow, when the company's questionnaire answers conflict with signals from crawled data, the system surfaces these in real-time.

**Implementation:** LLM compares crawled data extracts against each questionnaire answer. If a contradiction is detected (e.g., company says "we value work-life balance" but review signals suggest otherwise), the system displays a gentle prompt asking the company user to confirm or revise.

**Tone:** Never accusatory. Framed as: "We found some public information that seems different from this — want to clarify so your matches are as accurate as possible?"

**This ships in Phase 1** as a natural extension of the intelligence layer. The LLM is already processing crawled data — contradiction detection is a prompt engineering problem, not an infrastructure one.

#### 6.1.4 Hiring Profile Summary

At the end of the questionnaire, the system generates a polished Hiring Profile summary:

- Company DNA snapshot
- Culture signature (3-5 defining traits)
- Working environment summary
- What great looks like here
- What doesn't work here

This is the main artifact on the company's Hiring Spa portal view. Always visible, always editable, always the foundation for role matching.

### 6.2 Role Submission & JD Beautification

#### 6.2.1 Role Selection

**Phase 1 flow (URL-based):**
1. Company pastes one or more job posting URLs from their ATS (works with any ATS — Greenhouse, Lever, Ashby, Workable, etc.).
2. System fetches and extracts the JD content from the URL.
3. Company confirms the extracted content is correct.

**Phase 3 upgrade (API-based):**
- OAuth integration with Greenhouse, Lever, Ashby APIs.
- System pulls open roles directly. Company selects which to beautify.
- Bi-directional status sync.

**Fallback:** Paste raw JD text directly if URL extraction fails.

#### 6.2.2 JD Beautification (AI-Generated Draft + Guided Journey)

The raw JD is transformed into a Beautified JD through an AI-assisted guided process:

**Step 1 — AI Analysis:** LLM processes the raw JD combined with the company's Hiring Profile to generate a structured beautified draft. Pre-fills all sections below.

**Step 2 — Guided Clarifying Questions:** System asks the company user targeted questions about the five match dimensions (see Section 6.4) to refine areas the AI couldn't confidently fill. Company confirms or edits each section.

**Step 3 — Dimension Weight Setting:** Company sets relative importance of each match dimension for this role via sliders or a similar control. (e.g., a culture-first startup might weight Culture and DNA higher; a scaling team might weight Technical higher.)

**Beautified JD Structure:**

**Requirements with Weight & Nuance.** Each requirement is categorized:
- **Essential** — Non-negotiable.
- **Nice to Have** — Valued but not required.

Each requirement allows caveats or notes. Examples:
- "5+ years of experience" → "We care more about what you've built than years on a resume. 3 years with strong shipping history works."
- "Experience with Kubernetes" → "Willing to learn counts. We'll pair you with someone senior."

**Team Context Section:**
- The exact team this role joins.
- Who the manager is and what they care about in hiring.
- Team's current priorities and challenges.
- What the team would say matters most in a new hire.

**Current Working Vibe:**
- Typical week for this role.
- Remote/hybrid/in-office specifics with honest context.
- Meeting load, focus time, on-call expectations.
- Current team energy — build mode, maintenance mode, scaling mode?

**Culture Check Section:**
- How this team specifically embodies the company's culture.
- Team-specific cultural nuances.
- What a new hire would need to navigate in the first 90 days.

#### 6.2.3 Technical Challenge (Optional)

Companies can attach a take-home technical challenge:
- **Blank form:** Write the challenge directly in the system.
- **Upload:** Document, repo link, any format.

**Grading:** Auto-graded component (test suites, code quality metrics) + human review from a Fractal engineering leader. Both scores surfaced to the company user.

**Display on Engineer Card:** Challenge completion status and grade percentage are visible before the user looks at GitHub or resume. Badge states: Completed (with score) or Pending.

**Timing:** Engineer sees the Beautified JD first, then completes the challenge if one exists. Context before commitment.

### 6.3 Engineer Profiling

#### 6.3.1 Data Collection

**Required:** LinkedIn, resume/CV, GitHub.
**Optional but encouraged:** Portfolio site, blog or public writing, any other public presence.

**Intelligence Layer:** Same automated crawling pipeline as the company side. Before asking engineers a single question, the system reads everything available — LinkedIn history, GitHub repos and contribution patterns, blog content, portfolio projects. Draft profile built automatically.

#### 6.3.2 Engineer Questionnaire

**Work Preferences:** What type of environment they thrive in, remote/hybrid/in-office preference, ideal team dynamic, management style that brings out their best.

**Career & Growth:** What they're looking for next, where they want to grow, what problems excite them.

**Strengths:** What they're genuinely great at, what colleagues come to them for.

**Areas for Growth (Honest Framing):** What they're actively working to improve, what support would help them grow. Framed constructively — not weaknesses but growth vectors. This transparency is a feature.

**Deal Breakers:** Non-negotiables, what would make them leave a role.

#### 6.3.3 Engineer Experience

Engineers do not have a portal. Their flow:

1. Profiled by Fractal (with consent, participation via questionnaire).
2. When matched → email with unique link to the Beautified JD.
3. Engineer enters their email to view the full JD (email gate — see Section 6.5).
4. If a challenge exists → complete it after viewing the JD.
5. Notified of outcomes by Fractal (manual, mediated).

The Beautified JD is their window into the company. It should be so good, so honest, and so well-crafted that the engineer knows within minutes whether this is a place they want to work.

#### 6.3.4 Engineer Entry (Phase 1)

For Phase 1, all engineers are **Fractal-sourced only**. No self-signup, no referral flow. Fractal identifies, profiles, and onboards engineers into the matching pool. Self-signup and referral mechanics are Phase 3+.

### 6.4 Matching System

#### 6.4.1 Five Match Dimensions

Every match is scored across five dimensions, each rated individually and rolling up into an overall match percentage:

1. **Mission** — Company's mission and purpose vs. what the engineer cares about. Industry alignment. Stage alignment (startup vs. growth vs. enterprise).

2. **Technical** — Role requirements (weighted Essential vs. Nice to Have, with caveats) vs. engineer's abilities, experience, and growth trajectory. Stack overlap and adjacency. Challenge score if completed.

3. **Culture** — Company culture signature and DNA vs. engineer's work style, values, and personality. Team-specific factors from the Beautified JD. Communication style alignment.

4. **Environment** — Working vibe, remote/hybrid/in-office, meeting culture, autonomy vs. engineer's preferences and deal breakers. Management style alignment. Work-life balance expectations.

5. **DNA** — The intangible alignment. Attributes of the company's best people vs. engineer's natural tendencies. Growth trajectory alignment. Honest fit signals that don't fit neatly into the other four.

#### 6.4.2 Scoring

- Each dimension: 0-100%.
- Overall match: weighted composite of all five.
- **Dimension weights are set per role by the company** during the JD beautification flow (Section 6.2.2, Step 3).
- Minimum thresholds enforced — 98% Technical with 30% Culture should not surface as a strong match.
- Scoring is LLM-powered, using the structured data from both company and engineer profiles.

#### 6.4.3 Match Presentation

**Three matches per role. No more.** This is not a leaderboard. The product promise is curation through trust — "we did the homework, here are your three."

Matches are **Engineer Cards** on the company portal.

**Collapsed state (default):**
- Engineer name
- Key technical skills (top 3)
- Challenge status badge (Completed with score / Pending / N/A)
- Overall match percentage

**Expanded state (click to expand):**
- One-line insight or highlight quote
- Five-dimension score breakdown with progress bars
- Action buttons: Move Forward / Pass
- Link to full profile

Progressive disclosure — calm surface, depth on demand.

### 6.5 Engineer-Facing Beautified JD Page

Each beautified JD has a dedicated page, accessible via a unique URL.

**URL structure:** `partners.fractaltech.nyc/jd/{uuid}`

**Access model:** Unique link + email gate.
- Engineer clicks the link (received via email from Fractal).
- Landing view shows the company name, role title, and a brief teaser.
- Engineer enters their email to view the full beautified JD.
- Email capture enables: view tracking, engagement analytics, matching the viewer to an engineer profile.

**No authentication required.** The email gate is lightweight — no account creation, no password.

**Content displayed:** The complete beautified JD (see Section 6.2.2 structure). Designed to be mobile-responsive. Styled with the Hiring Spa design system, not the main portal design.

### 6.6 Company Portal Experience

#### 6.6.1 Portal Home (Hiring Spa View)

When a company user with Hiring Spa access logs in, they see the Hiring Spa as a section/route within the portal:

- **Route:** `/hiring-spa` (or nested under the existing portal layout)
- **Their Hiring Profile** — always present, always the anchor. Editable.
- **Submitted Roles** — each role with match counts.
- **Matches by Role** — three engineer cards per role.

The Hiring Spa view uses its own design system (Section 7) while living within the portal shell.

#### 6.6.2 Interaction Model

The company user's only decisions:
- **Move Forward** — signals interest, records in DB, emails Fractal team for manual orchestration.
- **Pass** — removes from view, records the decision.
- **View Full Profile** — deep dive into the engineer's complete profile.

No pipelines, no stages, no drag-and-drop. The Hiring Spa handles orchestration.

#### 6.6.3 Post-"Move Forward" Flow

1. Decision recorded in the database (`hiring_spa_matches` table, decision + decision_at updated).
2. Email sent to Fractal team with context: which company, which role, which engineer, match scores.
3. Email sent to engineer with company name, role title, match score, and CTA link to the beautified JD page.
4. Engineer views JD → consent card shown ("This company is interested in you. Would you like to be introduced?").
5. Engineer responds "I'm Interested" or "Not for Me" → decision recorded on match.
6. If interested → Fractal notified that both sides are ready for intro.
7. Company match card shows engineer's consent status badge ("Engineer Interested" / "Engineer Declined" / "Awaiting Engineer").

#### 6.6.4 Session Pacing

Designed for a ten-minute session. Matches presented in curated order (highest match first, three per role). Interface does not reward binge-scrolling. Generous whitespace, unhurried typography, no notification counts or urgency indicators.

Footer: "The calmest 10 minutes of your workday."

---

## 7. Design System

The Hiring Spa has its own design language, distinct from the main Fractal portal style guide. It lives within the same application but uses a different palette, typography, and feel.

### 7.1 Palette

Implemented in `portal/app/(portal)/hiring-spa/hiring-spa.css`, scoped under `.hiring-spa` wrapper. Full token definitions from the design system reference (`/Downloads/hiring-spa-design-system/tokens.css`).

| Name | Hex | Usage |
|------|-----|-------|
| Platinum | `#E8E4DF` | Page backgrounds, primary surface |
| Fog | `#F7F5F2` | Cards, elevated surfaces, inputs |
| Parchment | `#FAF8F5` | Header backgrounds, accent cards, paper-like warmth |
| Honey | `#C9A86C` | Primary accent — progress bars, active states, highlights (use sparingly) |
| Stone | `#A69B8D` | Borders, dividers, secondary elements |
| Charcoal | `#2C2C2C` | Primary text, headings |
| Graphite | `#5C5C5C` | Secondary text, body copy |
| Mist | `#9C9C9C` | Tertiary text, labels, timestamps |
| Success | `#7A9E7A` | Positive states, completed items |
| Match | `#8B7355` | Match percentages, warm emphasis |

No pure whites. Every surface has warmth. The spa intentionally does NOT support dark mode — the warm palette is core to the experience. When dark mode is toggled, the `.hiring-spa` area stays light.

### 7.2 Typography

| Context | Font | Notes |
|---------|------|-------|
| Body text, headings | Georgia (serif) | Warm, readable, unhurried |
| System text, labels, data, scores | SF Mono | Precision, clarity, data display |

### 7.3 Motion

- No page load animations.
- Transitions: 150ms, functional only (expand/collapse, hover states).
- No decorative motion.

### 7.4 Principles

- **Pacing is the product.** Whitespace is generous. Nothing feels rushed.
- **Signal over noise.** Show only what matters for the decision at hand.
- **Warmth without softness.** The spa metaphor is about care and precision, not fluffiness.
- **Progressive disclosure.** Calm surface, depth on demand.

---

## 8. Data Model

The Hiring Spa extends the existing Supabase schema. New columns on existing tables + new tables for Hiring Spa-specific data.

### 8.1 Schema Changes to Existing Tables

**`profiles` table — add columns (migration 009):**

```sql
ALTER TABLE profiles ADD COLUMN has_hiring_spa_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN website_url TEXT;
ALTER TABLE profiles ADD COLUMN github_org TEXT;
CREATE INDEX idx_profiles_hiring_spa_access ON profiles (id) WHERE has_hiring_spa_access = true;
```

### 8.2 New Tables

#### `hiring_profiles` (migration 010, updated by 011)

Stores the company's completed Hiring Profile (the output of Phase A + B).

```sql
CREATE TABLE hiring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Intelligence layer raw data
  crawl_data JSONB,              -- SynthesisOutput: { companyDna, technicalEnvironment, crawlHighlights[], confidence }
  crawl_error TEXT,              -- Error message if crawl failed
  crawl_completed_at TIMESTAMPTZ,

  -- Synthesized profile (LLM-generated, company-refined)
  company_dna JSONB,             -- CompanyDNA: { mission, values[], culture, workStyle, fundingStage, teamSize, industry }
  technical_environment JSONB,   -- TechnicalEnvironment: { primaryLanguages[], frameworks[], infrastructure[], devPractices[], openSourceInvolvement }

  -- Questionnaire responses
  culture_answers JSONB,         -- CultureAnswers: { successful_employees, why_employees_stay, best_people_attributes, honest_working_style, what_doesnt_work }
  mission_answers JSONB,         -- MissionAnswers: { actual_mission, revealing_tradeoffs }
  team_dynamics_answers JSONB,   -- TeamDynamicsAnswers: { daily_communication, decision_making_style, conflict_handling }

  -- Contradiction detection
  contradictions JSONB,          -- Contradiction[]: { signal, answer_excerpt, question_id, suggestion, source, resolved }

  -- Profile summary (the polished artifact)
  profile_summary JSONB,         -- ProfileSummary: { companySnapshot, cultureSignature[], workingEnvironment, whatGreatLooksLike, whatDoesntWork, technicalSummary }

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'crawling', 'questionnaire', 'complete')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** `crawl_data` stores the full `SynthesisOutput` (not raw crawl content). The raw crawled pages are processed inline and not persisted separately. `crawlHighlights[]` within `crawl_data` are the key excerpts used for contradiction detection.

#### `hiring_roles`

Stores submitted roles and their beautified JDs.

```sql
CREATE TABLE hiring_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_profile_id UUID NOT NULL REFERENCES hiring_profiles(id) ON DELETE CASCADE,

  -- Source JD
  source_url TEXT,               -- Original ATS job posting URL
  source_content TEXT,           -- Extracted raw JD text

  -- Beautified JD (structured)
  title TEXT NOT NULL,
  beautified_jd JSONB,          -- Full structured beautified JD:
                                 -- { requirements[], team_context, working_vibe, culture_check }
                                 -- requirements[]: { text, weight: 'essential'|'nice_to_have', caveat }

  -- Dimension weights (set by company per role)
  dimension_weights JSONB DEFAULT '{"mission": 20, "technical": 20, "culture": 20, "environment": 20, "dna": 20}',

  -- Technical challenge (optional)
  challenge_description TEXT,
  challenge_attachment_url TEXT,
  has_challenge BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'beautifying', 'active', 'paused', 'closed')),

  -- Public JD page
  public_slug UUID DEFAULT gen_random_uuid(),  -- UUID for the /jd/{slug} page

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `engineer_profiles_spa`

Extended engineer profiles for matching (separate from the existing `engineers` table to avoid coupling).

```sql
CREATE TABLE engineer_profiles_spa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID REFERENCES engineers(id) ON DELETE SET NULL,  -- Link to existing engineer if applicable

  -- Basic info
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  linkedin_url TEXT,
  resume_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,

  -- Intelligence layer
  crawl_data JSONB,
  crawl_completed_at TIMESTAMPTZ,

  -- Questionnaire responses
  work_preferences JSONB,
  career_growth JSONB,
  strengths JSONB,
  growth_areas JSONB,
  deal_breakers JSONB,

  -- Synthesized profile
  profile_summary JSONB,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'crawling', 'questionnaire', 'complete')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hiring_spa_matches`

Stores computed matches between roles and engineers.

```sql
CREATE TABLE hiring_spa_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES hiring_roles(id) ON DELETE CASCADE,
  engineer_profile_id UUID NOT NULL REFERENCES engineer_profiles_spa(id) ON DELETE CASCADE,

  -- Dimension scores (0-100)
  score_mission INT CHECK (score_mission BETWEEN 0 AND 100),
  score_technical INT CHECK (score_technical BETWEEN 0 AND 100),
  score_culture INT CHECK (score_culture BETWEEN 0 AND 100),
  score_environment INT CHECK (score_environment BETWEEN 0 AND 100),
  score_dna INT CHECK (score_dna BETWEEN 0 AND 100),
  score_overall INT CHECK (score_overall BETWEEN 0 AND 100),

  -- Match reasoning (LLM-generated)
  match_reasoning JSONB,         -- Per-dimension reasoning text
  highlight_quote TEXT,          -- One-line insight for the card

  -- Challenge results (if applicable)
  challenge_status TEXT CHECK (challenge_status IN ('not_applicable', 'pending', 'completed')),
  challenge_auto_score INT,
  challenge_human_score INT,
  challenge_final_score INT,

  -- Company decision
  decision TEXT CHECK (decision IN ('pending', 'moved_forward', 'passed')),
  decision_at TIMESTAMPTZ,

  -- Presentation order (1, 2, or 3)
  display_rank INT CHECK (display_rank BETWEEN 1 AND 3),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(role_id, engineer_profile_id)
);
```

#### `jd_page_views`

Tracks engineer engagement with beautified JD pages.

```sql
CREATE TABLE jd_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES hiring_roles(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  engineer_profile_id UUID REFERENCES engineer_profiles_spa(id),  -- Linked if email matches a known engineer
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 RLS Policies

**`hiring_profiles` (migrations 010 + 011):**

```sql
ALTER TABLE hiring_profiles ENABLE ROW LEVEL SECURITY;

-- Company can read their own profile (migration 010)
CREATE POLICY "Company reads own hiring profile" ON hiring_profiles
  FOR SELECT USING (auth.uid() = company_id);

-- Company can update their own profile — saves questionnaire answers (migration 011)
CREATE POLICY "Company updates own hiring profile" ON hiring_profiles
  FOR UPDATE USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

-- Admins have full access (migration 010)
CREATE POLICY "Admins full access to hiring profiles" ON hiring_profiles
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- hiring_roles: company users can manage roles under their profile; admins full access
ALTER TABLE hiring_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company can manage own roles" ON hiring_roles
  FOR ALL USING (
    hiring_profile_id IN (SELECT id FROM hiring_profiles WHERE company_id = auth.uid())
  );
CREATE POLICY "Admin full access to roles" ON hiring_roles
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- hiring_spa_matches: company users can read matches for their roles; admins full access
ALTER TABLE hiring_spa_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company can view own matches" ON hiring_spa_matches
  FOR SELECT USING (
    role_id IN (
      SELECT hr.id FROM hiring_roles hr
      JOIN hiring_profiles hp ON hr.hiring_profile_id = hp.id
      WHERE hp.company_id = auth.uid()
    )
  );
CREATE POLICY "Company can update match decisions" ON hiring_spa_matches
  FOR UPDATE USING (
    role_id IN (
      SELECT hr.id FROM hiring_roles hr
      JOIN hiring_profiles hp ON hr.hiring_profile_id = hp.id
      WHERE hp.company_id = auth.uid()
    )
  );
CREATE POLICY "Admin full access to matches" ON hiring_spa_matches
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- engineer_profiles_spa: admin only (engineers don't have portal access)
ALTER TABLE engineer_profiles_spa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to engineer spa profiles" ON engineer_profiles_spa
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
-- Company users can read engineer profiles they've been matched with
CREATE POLICY "Company can view matched engineers" ON engineer_profiles_spa
  FOR SELECT USING (
    id IN (
      SELECT engineer_profile_id FROM hiring_spa_matches
      WHERE role_id IN (
        SELECT hr.id FROM hiring_roles hr
        JOIN hiring_profiles hp ON hr.hiring_profile_id = hp.id
        WHERE hp.company_id = auth.uid()
      )
    )
  );

-- jd_page_views: public insert (email gate), admin read
ALTER TABLE jd_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a JD view" ON jd_page_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read JD views" ON jd_page_views
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

---

## 9. Technical Architecture

### 9.1 Intelligence Layer (Crawling Pipeline)

**Components:**

1. **URL Discovery:** Given a company's LinkedIn URL, discover their website, GitHub org, Twitter, blog. Use LinkedIn company page as the starting point.

2. **Web Crawler:** Fetch all discoverable pages for each source. Extract text content, strip navigation/boilerplate. Store raw content in `hiring_profiles.crawl_data` as structured JSONB (keyed by source).

3. **Content Synthesizer:** LLM processes all crawled content against a structured prompt to generate the draft hiring profile. Output is structured JSONB matching the `company_dna`, `technical_environment`, etc. columns.

4. **Contradiction Detector:** During the questionnaire flow, LLM compares each answer against relevant crawled content extracts. Returns contradiction flags with source citations.

**Implementation (Phase 1):**
- Server-side API routes in the Next.js app. Crawl runs inline in `POST /api/admin/hiring-spa/crawl` (not a background job — sufficient for Phase 1 scale).
- Status tracked via `hiring_profiles.status` field (`draft` → `crawling` → `questionnaire` → `complete`).
- LLM calls via Anthropic API (Claude Sonnet `claude-sonnet-4-20250514`) for both synthesis and contradiction detection.
- LinkedIn and Glassdoor not crawled (anti-scraping protections). LinkedIn URL stored as metadata and factored into confidence scoring.
- `robots.txt` respected via `robots-parser` package.

### 9.2 JD Beautification Engine

1. Company submits URL(s) or raw text.
2. System fetches JD content from URL.
3. LLM transforms raw JD + company Hiring Profile into structured beautified JD (JSONB).
4. Guided questions presented to company for refinement.
5. Company sets dimension weights via UI controls.
6. Beautified JD saved to `hiring_roles.beautified_jd`.
7. Public page generated at `/jd/{public_slug}`.

### 9.3 Matching Engine

- Multi-dimensional scoring across 5 dimensions.
- Weighted composite using per-role `dimension_weights`.
- Minimum threshold enforcement (configurable per dimension).
- LLM-powered scoring using structured profile and role data.
- Runs asynchronously when new matches are possible (new engineer profiled, new role submitted, profile updated).
- Top 3 matches per role stored in `hiring_spa_matches` with `display_rank`.

### 9.4 Notifications

Email only. No in-app notification noise.

| Event | Recipient | Method | Status |
|-------|-----------|--------|--------|
| New matches available | Company user | Email with link to portal | Phase 4 |
| Company clicks "Move Forward" | Fractal team | Email with full context | ✅ Phase 2b |
| Company clicks "Move Forward" | Engineer | Automated email with JD link + match score | ✅ Phase 3 |
| Engineer responds "Interested" | Fractal team | Email: both sides ready for intro | ✅ Phase 3 |

### 9.5 Routes

| Route | Purpose | Auth | Access | Status |
|-------|---------|------|--------|--------|
| `/hiring-spa` | Hiring Spa home (profile + roles + matches) | Yes | `has_hiring_spa_access = true` | ✅ Phase 1b |
| `/hiring-spa/profile` | Company Hiring Profile creation/edit | Yes | `has_hiring_spa_access = true` | ✅ Phase 1b |
| `/hiring-spa/roles` | Role list and submission | Yes | `has_hiring_spa_access = true` | ✅ Phase 1c |
| `/hiring-spa/roles/[id]` | Single role with matches | Yes | `has_hiring_spa_access = true` | ✅ Phase 1c |
| `/hiring-spa/roles/new` | New role submission + beautification flow | Yes | `has_hiring_spa_access = true` | ✅ Phase 1c |
| `/jd/[slug]` | Public beautified JD page (email-gated) | No | Public (email gate) | ✅ Phase 1c |
| `/engineer/apply` | Engineer self-signup (info → crawl → questionnaire → confirmation) | No | Public (middleware exemption) | ✅ Phase 3 |
| `/admin/hiring-spa` | Admin overview of all Hiring Spa activity | Yes | Admin only | Phase 2b+ |

**API Routes:**

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/admin/hiring-spa/crawl` | POST | Trigger crawl for a company | ✅ Phase 1a |
| `/api/admin/hiring-spa/status/[companyId]` | GET | Check crawl status | ✅ Phase 1a |
| `/api/hiring-spa/profile` | GET | Company reads own profile | ✅ Phase 1a |
| `/api/hiring-spa/answers` | POST | Save section answers + contradiction detection | ✅ Phase 1b |
| `/api/hiring-spa/summary` | POST | Generate profile summary, set status=complete | ✅ Phase 1b |
| `/api/hiring-spa/roles` | GET/POST | List/create roles for company | ✅ Phase 1c |
| `/api/hiring-spa/roles/[id]` | GET/PATCH | Get/update role | ✅ Phase 1c |
| `/api/hiring-spa/roles/beautify` | POST | Trigger JD beautification | ✅ Phase 1c |
| `/api/admin/hiring-spa/engineers` | GET/POST | List/create engineer profiles | ✅ Phase 2a |
| `/api/admin/hiring-spa/engineers/[id]` | GET/PATCH | Get/update engineer profile | ✅ Phase 2a |
| `/api/admin/hiring-spa/engineers/[id]/crawl` | POST | Trigger engineer crawl pipeline | ✅ Phase 2a |
| `/api/admin/hiring-spa/engineers/[id]/summary` | POST | Generate engineer profile summary | ✅ Phase 2a |
| `/api/hiring-spa/matches` | GET | List matches by role_id (with engineer + feedback join) | ✅ Phase 2b |
| `/api/hiring-spa/matches/[id]/decision` | PATCH | Record match decision (moved_forward / passed) | ✅ Phase 2b |
| `/api/hiring-spa/matches/[id]/feedback` | GET/POST | Fetch/upsert match quality feedback | ✅ Phase 3 |
| `/api/jd/engineer-consent` | POST | Engineer responds to match (interested / not_interested) | ✅ Phase 3 |

---

## 10. Resolved Decisions

These questions from the original PRD v1.0 are now resolved:

| Question | Decision | Rationale |
|----------|----------|-----------|
| How is Hiring Spa access gated? | Feature flag (`has_hiring_spa_access`) on `profiles` table | Simple, works with existing auth, admin-controlled |
| Intelligence layer scope for Phase 1? | Full automated crawling pipeline | Foundation-first approach; everything depends on it |
| How are beautified JDs created? | AI-generated draft + guided journey with clarifying questions | Balances automation with company input |
| ATS integration level for Phase 1? | URL-based scraping; API integration as Phase 3 upgrade | Works with any ATS immediately, no OAuth setup |
| Data model for hiring profiles? | Extension of existing tables + new dedicated tables | Clean separation for Hiring Spa data, simple flag on profiles |
| Contradiction detection timing? | Phase 1, LLM-powered | Natural extension of intelligence layer |
| Engineer-facing JD access? | Unique URL + email gate | Low friction, captures engagement signal |
| Can companies customize dimension weights? | Yes, per role during JD beautification | Gives companies meaningful control |
| How many matches per role? | 3 | Remove choice fatigue with trust. Curation, not a leaderboard. |
| Challenge before or after JD? | After — engineer sees JD first | Context before commitment |
| Post-"Move Forward" flow? | Email to Fractal + DB record, manual orchestration | High-touch for Phase 1, Fractal mediates all intros |
| Engineer entry? | Fractal-sourced only for Phase 1 | Matches invite-only positioning |

---

## 11. Build Phases

### Phase 1a — Intelligence Layer ✅ COMPLETE

Build the automated crawling and analysis pipeline. This is the foundation everything else depends on.

**Deliverables (all shipped):**
- Web crawling service (`lib/hiring-spa/crawl.ts` — fetch + extract text from URLs via Cheerio)
- URL discovery from website (`lib/hiring-spa/discover.ts`)
- GitHub org analysis (`lib/hiring-spa/github-analysis.ts`)
- LLM synthesis pipeline (`lib/hiring-spa/synthesize.ts` — crawled content → structured SynthesisOutput via Claude Sonnet)
- Full crawl pipeline orchestrator (`lib/hiring-spa/pipeline.ts`)
- Storage of crawl data and synthesized output in `hiring_profiles` table
- Admin API: `POST /api/admin/hiring-spa/crawl` to trigger crawl, `GET /api/admin/hiring-spa/status/[companyId]`
- `GET /api/hiring-spa/profile` — company reads own profile
- Status tracking: `draft` → `crawling` → `questionnaire`

**Database:** `hiring_profiles` table (migration 010), `has_hiring_spa_access` + `website_url` + `github_org` columns on `profiles` (migration 009).

**Implementation notes:**
- Crawl pipeline runs inline in the API route (not a background job) — sufficient for Phase 1 scale
- LinkedIn and Glassdoor not crawled (blocked by anti-scraping); LinkedIn URL stored as context, factored into confidence score
- SynthesisOutput includes `crawlHighlights[]` with topic tags used by Phase 1b contradiction detection
- Confidence score (0-1) on synthesis output drives adaptive question behavior in Phase 1b

### Phase 1b — Company Hiring Profile ✅ COMPLETE

The guided questionnaire, contradiction detection, and profile summary.

**Deliverables (all shipped):**
- Hiring Spa access gate:
  - Middleware (`middleware.ts`) — `/hiring-spa` added to protected routes, checks `has_hiring_spa_access`
  - Defense-in-depth layout check (`app/(portal)/hiring-spa/layout.tsx`) — production only (dev mode bypasses for local testing)
  - Header nav link ("Hiring Spa") conditionally rendered via `hasHiringSpaAccess` prop
  - Portal layout queries `has_hiring_spa_access` from profiles table
- `/hiring-spa` portal home — status-based content:
  - `draft`: "Your profile hasn't been started yet"
  - `crawling`: "We're analyzing your web presence" with progress bar
  - `questionnaire`: Link to questionnaire with progress indicator (X of 4 sections)
  - `complete`: Rendered ProfileSummary card with edit link
  - Skeleton placeholders for future Phase 1c sections (roles, matches)
- `/hiring-spa/profile` — guided questionnaire:
  - 4 independently saveable sections: Culture & DNA (5 questions), Mission & Values (2), Team Dynamics (3), Technical Environment (tag editor)
  - Pre-populated from crawl synthesis via `resolvePrefill()` with dot-path mappings
  - Adaptive questions based on synthesis confidence: high (≥0.7) → pre-filled + "Based on your website" badge; medium (≥0.4) → suggestion shown as quote; low → standard question
  - Previously saved answers take priority over pre-fill
  - Section save via `POST /api/hiring-spa/answers` with inline contradiction detection
  - "Generate Profile Summary" button enabled when all 4 sections saved
- Contradiction detection (`lib/hiring-spa/contradictions.ts`):
  - Claude Sonnet compares answers vs relevant crawl highlights by topic
  - Gentle, non-accusatory tone: "We found some public information that seems different"
  - User can "Keep my answer" (marks resolved) or "Revise" (scrolls to textarea)
  - Contradictions merged across sections, preserved on re-save
- Profile summary generation (`lib/hiring-spa/summary.ts`):
  - `POST /api/hiring-spa/summary` (maxDuration=60)
  - Produces structured ProfileSummary: companySnapshot, cultureSignature[], workingEnvironment, whatGreatLooksLike, whatDoesntWork, technicalSummary
  - Sets status to `complete`
- Design system: scoped CSS (`hiring-spa.css`) under `.hiring-spa` wrapper with full token set from design reference
  - Georgia serif + SF Mono typography, parchment/honey/stone palette
  - Component styles: cards, buttons, forms, badges, tags, contradictions, summary, progress bars
  - Force-light-mode (ignores dark mode toggle)

**Database:** `hiring_profiles` table fully utilized. Migration 011 adds RLS UPDATE policy for company self-service saves.

**Components built:**
- `QuestionnaireForm` — main client component orchestrating all 4 sections
- `QuestionSection` — reusable section wrapper with independent save button
- `AdaptiveQuestion` — single question with pre-fill logic + confidence badge
- `ContradictionAlert` — gentle contradiction prompt with keep/revise actions
- `TechEditor` — tag chips (languages, frameworks, infrastructure) + text fields
- `ProfileSummary` — rendered profile summary card

**Types added to `lib/hiring-spa/types.ts`:**
- `CultureAnswers`, `MissionAnswers`, `TeamDynamicsAnswers` — questionnaire answer shapes
- `Contradiction` — signal, answer_excerpt, question_id, suggestion, source, resolved
- `ProfileSummary` — companySnapshot, cultureSignature[], workingEnvironment, whatGreatLooksLike, whatDoesntWork, technicalSummary
- `HiringProfile` updated to use typed fields instead of `unknown`

### Phase 1c — JD Beautification ✅ COMPLETE

Role submission, AI-powered JD transformation, and the engineer-facing JD page.

**Deliverables (all shipped):**
- `/hiring-spa/roles/new` — role submission flow
  - URL input (paste ATS job posting URL) or raw text paste fallback
  - JD content extraction from URL (`lib/hiring-spa/jd-extract.ts`)
  - AI beautification (`lib/hiring-spa/beautify.ts` — raw JD + hiring profile → structured BeautifiedJD via Claude Sonnet)
  - Dimension weight setting (sliders with raw 1-10 values normalized to percentages)
  - Requirements with essential/nice-to-have categorization + caveats
  - JD feedback UI (confirm/reject requirements, sentiment on prose sections)
- `/hiring-spa/roles` — role list view with RoleCard components
- `/hiring-spa/roles/[id]` — role detail with interactive JD editor (RoleDetailClient)
- `/jd/[slug]` — public beautified JD page
  - Email gate (EmailGate component — enter email to view full content)
  - Mobile-responsive, Hiring Spa design system
  - BeautifiedJDView component for rendering structured JD
- `jd_page_views` tracking

**Database:** `hiring_roles` table (migration 012), `jd_page_views` table (migration 012), `dimension_weights_raw` + `jd_feedback` columns (migration 013).

**Components built:**
- `RoleCard` — role list card with status badge
- `RoleDetailClient` — main client component for role editing/viewing
- `RoleSubmissionForm` — URL/text input + title for new roles
- `BeautifiedJDView` — renders structured beautified JD
- `InteractiveJDView` — JD with inline feedback (confirm/reject/notes)
- `DimensionWeightSliders` — 5-dimension weight sliders with live normalization
- `EmailGate` — email capture for public JD page

**Types added to `lib/hiring-spa/types.ts`:**
- `RoleStatus`, `BeautifiedRequirement`, `BeautifiedJD`, `DimensionWeights`, `DimensionWeightsRaw`
- `RequirementFeedback`, `ProseSectionFeedback`, `JDFeedback`
- `HiringRole`, `JDPageView`, `ExtractedJD`

### Phase 2a — Engineer Profiles ✅ COMPLETE

Engineer crawl pipeline, synthesis, questionnaire definitions, and admin API — the backend for engineer profiling.

**Deliverables (all shipped):**
- Engineer crawl pipeline (`lib/hiring-spa/engineer-crawl.ts`)
  - GitHub user analysis (adapted from org analysis for individual accounts)
  - Portfolio/blog page crawling (reuses existing `crawlUrls`)
  - Background execution via Next.js `after()` with error recovery
- Engineer LLM synthesis (`lib/hiring-spa/engineer-synthesis.ts`)
  - Claude Sonnet with structured JSON output
  - Produces `EngineerDNA`: top skills, languages, frameworks, seniority signal, project highlights, public writing
  - Confidence score based on data availability
- Engineer question definitions (`lib/hiring-spa/engineer-questions.ts`)
  - 5 sections, 13 questions: Work Preferences (4), Career & Growth (3), Strengths (2), Growth Areas (2), Deal Breakers (2)
  - Prefill resolution from EngineerDNA
  - No contradiction detection (engineers are honest about themselves)
- Engineer summary generation (`lib/hiring-spa/engineer-summary.ts`)
  - Claude Sonnet producing `EngineerProfileSummary`: snapshot, technical identity, work style, growth trajectory, best-fit signals, deal breakers
- Admin API routes (all admin-only via `withAdmin()` wrapper):
  - `GET/POST /api/admin/hiring-spa/engineers` — list (with status filter) / create
  - `GET/PATCH /api/admin/hiring-spa/engineers/[id]` — get / update (questionnaire answers, status)
  - `POST /api/admin/hiring-spa/engineers/[id]/crawl` — trigger crawl pipeline
  - `POST /api/admin/hiring-spa/engineers/[id]/summary` — generate profile summary

**Database:** `engineer_profiles_spa` table (migration 014) with FK to `engineers`, JSONB columns for crawl/DNA/answers/summary, status check constraint, indexes on engineer_id/status/email, admin-only RLS.

**Types added to `lib/hiring-spa/types.ts`:**
- `EngineerProfileStatus`, `EngineerCrawlData`, `EngineerDNA`
- `WorkPreferencesAnswers`, `CareerGrowthAnswers`, `StrengthsAnswers`, `GrowthAreasAnswers`, `DealBreakersAnswers`
- `EngineerProfileSummary`, `EngineerProfileSpa`

### Phase 2b — Matching Engine ✅ COMPLETE

Five-dimension matching engine and company-facing match presentation.

**Deliverables (all shipped):**
- Five-dimension matching engine (`lib/hiring-spa/matching.ts` — LLM-powered scoring via Claude Sonnet)
  - Scores all complete engineers against a role across mission, technical, culture, environment, DNA
  - Weighted composite using per-role `dimension_weights`
  - Reasoning text per dimension + highlight quote
  - Top matches stored with display rank
  - Auto-triggered on beautification completion
- Company portal: engineer match cards (EngineerMatchCard component)
  - Collapsed: name, top skills, status badge, overall score
  - Expanded: highlight quote, dimension breakdown with bars, reasoning
- Move Forward / Pass interaction model
  - `PATCH /api/hiring-spa/matches/[id]/decision` — updates decision + decision_at
  - Passed cards collapse to minimal view
  - Moved Forward shows success badge
- Post-match flow: DB record + fire-and-forget email to Fractal team via Resend
- Challenge response flow on public JD page (accept/decline)
- `GET /api/hiring-spa/matches` — fetch matches by role_id with engineer join

**Database:** `hiring_spa_matches` table with RLS (company read/update own, admin full access). Challenge response columns added.

### Phase 3 Core — Notifications, Multi-Role, Feedback ✅ COMPLETE

Three core Phase 3 features: automated engineer notifications, multi-role submission, and match quality feedback.

**Deliverables (all shipped):**
- Automated engineer notifications with two-sided consent:
  - `EngineerMatchNotificationEmail` template (`emails/engineer-match-notification.tsx`) — brutalist design, CTA to JD page
  - `notifyEngineerOfMatch()` in `lib/hiring-spa/notifications.ts` — sends email via Resend, marks `engineer_notified_at`
  - Triggered fire-and-forget on company "Move Forward" decision (alongside existing Fractal notification)
  - `POST /api/jd/engineer-consent` — engineer responds interested/not_interested, notifies Fractal when both sides ready
  - `/api/jd/view` returns consent state (`engineer_decision`, `engineer_notified_at`)
  - Consent UI on `/jd/[slug]` page — "I'm Interested" / "Not for Me" buttons, confirmation message
  - Engineer consent badges on company match card: "Engineer Interested" (success), "Engineer Declined" (muted), "Awaiting Engineer" (honey)
- Multi-role submission:
  - `POST /api/hiring-spa/roles` accepts `{ urls: string[] }` for batch creation
  - `POST /api/hiring-spa/roles/beautify` accepts `{ role_ids: string[] }` for batch beautification
  - `RoleSubmissionForm` URL input changed to textarea (one URL per line)
  - Batch preview with "Beautify All" button → redirect to roles list
  - Single URL and text paste modes unchanged
- Match quality feedback:
  - `match_feedback` table (unique per match_id) with hired, rating 1-5, worked_well, didnt_work, would_use_again
  - `GET/POST /api/hiring-spa/matches/[id]/feedback` — fetch and upsert feedback
  - `MatchFeedbackForm` component — hired toggle, conditional fields (rating/notes if hired, "what didn't work" if not)
  - Feedback summary on match card (hired badge, rating, notes)
  - "Give Feedback" button on moved-forward matches without feedback
  - Matches API and role detail page join `match_feedback` in queries

**Database:** Migration 018 — `engineer_notified_at`, `engineer_decision`, `engineer_decision_at` columns on `hiring_spa_matches` + `match_feedback` table with RLS, indexes, updated_at trigger.

**Types added to `lib/hiring-spa/types.ts`:**
- `engineer_notified_at`, `engineer_decision`, `engineer_decision_at` on `HiringSpaMatch`
- `MatchFeedback` interface
- `feedback?: MatchFeedback` on `MatchWithEngineer`

**Components built:**
- `MatchFeedbackForm` — inline feedback form for moved-forward matches

### Phase 3 Remaining — Integration & Scale

ATS API integration, challenge infrastructure, and additional automation.

**Deliverables:**
- ATS API integration (Greenhouse, Lever, Ashby — OAuth, role sync)
- Technical challenge infrastructure (upload, auto-grading pipeline, human review workflow)
- Engineer self-signup ✅ SHIPPED (`/engineer/apply` — public, middleware-exempted)
- Referral entry paths

### Phase 4 — Refinement

Optimization and analytics.

**Deliverables:**
- Match quality feedback loops feeding back into scoring
- Post-match orchestration (interview scheduling, etc.)
- Internal analytics dashboard
- A/B testing on match presentation
- Performance optimization on crawling pipeline

---

## 12. Success Metrics

**Primary:**
- Portal sessions average ≤ 10 minutes.
- \>70% of "Move Forward" decisions result in mutual interest.
- Decision within 48 hours of match surfacing.

**Secondary:**
- \>90% hiring profile completion rate (companies who start finish).
- \>80% beautified JDs approved with minor/no edits to the AI-generated draft.
- Engineer JD page experience rated 4.5+/5.
- \>60% challenge completion rate.
- \>80% company return rate (come back for next batch of matches).

**North Star:**
- **Hires per role submitted** — the percentage of submitted roles that result in a hire through the Hiring Spa.

---

## 13. Open Questions (Remaining)

These are non-blocking for Phase 1 but should be resolved before Phase 3:

| Question | Notes |
|----------|-------|
| How often do we refresh engineer data? | Re-crawl schedule for GitHub activity, new blog posts, etc. |
| Can an engineer match to multiple companies simultaneously? | Likely yes, but need to define how exclusivity/timing works. |
| How do we normalize scoring across different challenge types? | Matters when challenges vary widely in difficulty. |
| Pricing model | Per role, per match, per hire, subscription? Affects Phase 3+ features. |
| Fractal's role post-match | How much hand-holding? Interview prep? Negotiation support? |
| Visual parity for engineers without a challenge | How do cards look when there's no challenge score to show? |

---

*The calmest ten minutes of your workday.*
