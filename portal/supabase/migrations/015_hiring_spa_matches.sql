-- Phase 2b: Matching engine — matches table + dimension key rename

-- =========================================
-- 1. Rename dimension JSONB keys on hiring_roles
-- =========================================

-- Rename keys in dimension_weights: technical_skills→technical, culture_fit→culture,
-- experience_level→mission, growth_potential→dna, collaboration→environment
UPDATE hiring_roles
SET dimension_weights = jsonb_build_object(
  'technical', COALESCE(dimension_weights->'technical_skills', '20'),
  'culture',   COALESCE(dimension_weights->'culture_fit', '20'),
  'mission',   COALESCE(dimension_weights->'experience_level', '20'),
  'dna',       COALESCE(dimension_weights->'growth_potential', '20'),
  'environment', COALESCE(dimension_weights->'collaboration', '20')
)
WHERE dimension_weights ? 'technical_skills';

-- Same for dimension_weights_raw
UPDATE hiring_roles
SET dimension_weights_raw = jsonb_build_object(
  'technical', COALESCE(dimension_weights_raw->'technical_skills', '5'),
  'culture',   COALESCE(dimension_weights_raw->'culture_fit', '5'),
  'mission',   COALESCE(dimension_weights_raw->'experience_level', '5'),
  'dna',       COALESCE(dimension_weights_raw->'growth_potential', '5'),
  'environment', COALESCE(dimension_weights_raw->'collaboration', '5')
)
WHERE dimension_weights_raw IS NOT NULL AND dimension_weights_raw ? 'technical_skills';

-- Update column default
ALTER TABLE hiring_roles
  ALTER COLUMN dimension_weights
  SET DEFAULT '{"mission": 20, "technical": 20, "culture": 20, "environment": 20, "dna": 20}'::jsonb;

-- =========================================
-- 2. hiring_spa_matches table
-- =========================================

CREATE TABLE hiring_spa_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES hiring_roles(id) ON DELETE CASCADE,
  engineer_id UUID NOT NULL REFERENCES engineer_profiles_spa(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  dimension_scores JSONB NOT NULL,
  reasoning JSONB NOT NULL,
  highlight_quote TEXT,
  display_rank INTEGER NOT NULL,
  decision TEXT CHECK (decision IN ('moved_forward', 'passed')),
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hiring_spa_matches_role_id ON hiring_spa_matches (role_id);
CREATE INDEX idx_hiring_spa_matches_engineer_id ON hiring_spa_matches (engineer_id);
CREATE INDEX idx_hiring_spa_matches_role_rank ON hiring_spa_matches (role_id, display_rank);

-- Updated_at trigger (reuses existing function from 010)
CREATE TRIGGER set_hiring_spa_matches_updated_at
  BEFORE UPDATE ON hiring_spa_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE hiring_spa_matches ENABLE ROW LEVEL SECURITY;

-- Company can read matches for their own roles
CREATE POLICY "Company reads own matches"
  ON hiring_spa_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_roles
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_roles.id = hiring_spa_matches.role_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Company can update their own matches (for recording decisions)
CREATE POLICY "Company updates own matches"
  ON hiring_spa_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hiring_roles
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_roles.id = hiring_spa_matches.role_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins full access to hiring spa matches"
  ON hiring_spa_matches FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =========================================
-- 3. Let companies read matched engineer profiles
-- =========================================

CREATE POLICY "Company reads matched engineer profiles"
  ON engineer_profiles_spa FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_spa_matches
      JOIN hiring_roles ON hiring_roles.id = hiring_spa_matches.role_id
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_spa_matches.engineer_id = engineer_profiles_spa.id
        AND hiring_profiles.company_id = auth.uid()
    )
  );
