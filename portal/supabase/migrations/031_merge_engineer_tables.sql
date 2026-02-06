-- 031: Merge engineer_profiles_spa into engineers
-- This migration adds SPA columns to the engineers table, migrates data,
-- remaps FK references, updates RLS policies, and drops engineer_profiles_spa.

-- ============================================================
-- 1. Add SPA columns to engineers
-- ============================================================

ALTER TABLE engineers ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS crawl_data JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS crawl_error TEXT;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS crawl_completed_at TIMESTAMPTZ;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS engineer_dna JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS work_preferences JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS career_growth JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS strengths JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS growth_areas JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS deal_breakers JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS profile_summary JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'crawling', 'questionnaire', 'complete'));
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS priority_ratings JSONB;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS questionnaire_completed_at TIMESTAMPTZ;
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS matching_preferences JSONB DEFAULT '{}';
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS preferred_locations TEXT[];

-- github_url was NOT NULL in the original schema; SPA profiles don't require it
ALTER TABLE engineers ALTER COLUMN github_url DROP NOT NULL;

-- Indexes for auth and status lookups
CREATE INDEX IF NOT EXISTS idx_engineers_auth_user_id ON engineers (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_engineers_status ON engineers (status);

-- ============================================================
-- 2. Migrate data from engineer_profiles_spa (3 cases)
-- ============================================================

-- Case A: Rows that exist in both tables (linked by engineer_id or email).
-- Update engineers rows with SPA-specific data.
UPDATE engineers e
SET
  auth_user_id   = COALESCE(e.auth_user_id, eps.auth_user_id),
  crawl_data     = eps.crawl_data,
  crawl_error    = eps.crawl_error,
  crawl_completed_at = eps.crawl_completed_at,
  engineer_dna   = eps.engineer_dna,
  work_preferences = eps.work_preferences,
  career_growth  = eps.career_growth,
  strengths      = eps.strengths,
  growth_areas   = eps.growth_areas,
  deal_breakers  = eps.deal_breakers,
  profile_summary = eps.profile_summary,
  status         = eps.status,
  priority_ratings = eps.priority_ratings,
  questionnaire_completed_at = eps.questionnaire_completed_at,
  matching_preferences = eps.matching_preferences,
  preferred_locations = eps.preferred_locations,
  -- Also fill in any URL fields that engineers table was missing
  linkedin_url   = COALESCE(e.linkedin_url, eps.linkedin_url),
  portfolio_url  = COALESCE(e.portfolio_url, eps.portfolio_url),
  resume_url     = COALESCE(e.resume_url, eps.resume_url)
FROM engineer_profiles_spa eps
WHERE eps.engineer_id = e.id
   OR (eps.engineer_id IS NULL AND eps.email = e.email);

-- Case B: Rows that exist ONLY in engineer_profiles_spa (no matching engineers row).
-- Insert them into engineers, preserving the original UUID.
INSERT INTO engineers (
  id, name, email, github_url, linkedin_url, portfolio_url, resume_url,
  auth_user_id, crawl_data, crawl_error, crawl_completed_at,
  engineer_dna, work_preferences, career_growth, strengths,
  growth_areas, deal_breakers, profile_summary, status,
  priority_ratings, questionnaire_completed_at, matching_preferences,
  preferred_locations, created_at, updated_at
)
SELECT
  eps.id, eps.name, eps.email, eps.github_url, eps.linkedin_url, eps.portfolio_url, eps.resume_url,
  eps.auth_user_id, eps.crawl_data, eps.crawl_error, eps.crawl_completed_at,
  eps.engineer_dna, eps.work_preferences, eps.career_growth, eps.strengths,
  eps.growth_areas, eps.deal_breakers, eps.profile_summary, eps.status,
  eps.priority_ratings, eps.questionnaire_completed_at, eps.matching_preferences,
  eps.preferred_locations, eps.created_at, eps.updated_at
FROM engineer_profiles_spa eps
WHERE NOT EXISTS (
  SELECT 1 FROM engineers e
  WHERE e.id = eps.engineer_id OR e.email = eps.email
);

-- Case C: Engineers that only exist in engineers table — no action needed,
-- new columns default to NULL/draft.

-- ============================================================
-- 3. Drop old FK constraints (must happen before remapping IDs)
-- ============================================================

ALTER TABLE hiring_spa_matches DROP CONSTRAINT IF EXISTS hiring_spa_matches_engineer_id_fkey;
ALTER TABLE engineer_job_matches DROP CONSTRAINT IF EXISTS engineer_job_matches_engineer_profile_id_fkey;

-- Drop old unique constraint before column rename
ALTER TABLE engineer_job_matches DROP CONSTRAINT IF EXISTS engineer_job_matches_engineer_profile_id_scanned_job_id_key;

-- ============================================================
-- 4. Remap FK references in match tables
-- ============================================================

-- For Case A records, hiring_spa_matches.engineer_id and
-- engineer_job_matches.engineer_profile_id currently point to
-- engineer_profiles_spa.id (a different UUID). Remap them to engineers.id.

-- hiring_spa_matches: remap engineer_id from SPA UUID to engineers UUID
UPDATE hiring_spa_matches hsm
SET engineer_id = e.id
FROM engineer_profiles_spa eps
JOIN engineers e ON (eps.engineer_id = e.id OR (eps.engineer_id IS NULL AND eps.email = e.email))
WHERE hsm.engineer_id = eps.id
  AND eps.id != e.id;  -- only remap Case A (where IDs differ)

-- engineer_job_matches: remap engineer_profile_id from SPA UUID to engineers UUID
UPDATE engineer_job_matches ejm
SET engineer_profile_id = e.id
FROM engineer_profiles_spa eps
JOIN engineers e ON (eps.engineer_id = e.id OR (eps.engineer_id IS NULL AND eps.email = e.email))
WHERE ejm.engineer_profile_id = eps.id
  AND eps.id != e.id;  -- only remap Case A (where IDs differ)

-- Rename column: engineer_profile_id -> engineer_id
ALTER TABLE engineer_job_matches RENAME COLUMN engineer_profile_id TO engineer_id;

-- ============================================================
-- 5. Add new FK constraints referencing engineers
-- ============================================================

ALTER TABLE hiring_spa_matches
  ADD CONSTRAINT hiring_spa_matches_engineer_id_fkey
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE;

ALTER TABLE engineer_job_matches
  ADD CONSTRAINT engineer_job_matches_engineer_id_fkey
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE;

ALTER TABLE engineer_job_matches ADD CONSTRAINT engineer_job_matches_engineer_id_scanned_job_id_key UNIQUE (engineer_id, scanned_job_id);

-- Update indexes (drop old, create new)
DROP INDEX IF EXISTS idx_engineer_job_matches_profile;
DROP INDEX IF EXISTS idx_engineer_job_matches_rank;
CREATE INDEX IF NOT EXISTS idx_engineer_job_matches_engineer ON engineer_job_matches (engineer_id);
CREATE INDEX IF NOT EXISTS idx_engineer_job_matches_engineer_rank ON engineer_job_matches (engineer_id, display_rank);

-- ============================================================
-- 6. Update RLS policies on engineers
-- ============================================================

-- Add self-service read/update policies for engineers with auth_user_id
CREATE POLICY "Engineer reads own profile by auth"
  ON engineers FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Engineer updates own profile"
  ON engineers FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Update RLS on engineer_job_matches to join through engineers instead of engineer_profiles_spa
DROP POLICY IF EXISTS "Engineer reads own job matches" ON engineer_job_matches;
DROP POLICY IF EXISTS "Engineer updates own job matches" ON engineer_job_matches;

CREATE POLICY "Engineer reads own job matches"
  ON engineer_job_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM engineers
      WHERE engineers.id = engineer_job_matches.engineer_id
        AND engineers.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Engineer updates own job matches"
  ON engineer_job_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM engineers
      WHERE engineers.id = engineer_job_matches.engineer_id
        AND engineers.auth_user_id = auth.uid()
    )
  );

-- Update the hiring_spa_matches RLS policy for matched engineers reading their own profiles
-- (The "Company reads matched engineer profiles" policy on engineer_profiles_spa needs
-- an equivalent on engineers)
CREATE POLICY "Company reads matched engineers"
  ON engineers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_spa_matches
      JOIN hiring_roles ON hiring_roles.id = hiring_spa_matches.role_id
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_spa_matches.engineer_id = engineers.id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Drop engineer_profiles_spa
-- ============================================================

DROP TABLE IF EXISTS engineer_profiles_spa CASCADE;
