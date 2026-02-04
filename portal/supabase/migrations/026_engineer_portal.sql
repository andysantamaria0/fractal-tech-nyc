-- Link engineer_profiles_spa to auth.users for self-service login
ALTER TABLE engineer_profiles_spa
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority_ratings JSONB;

-- Index for auth lookup
CREATE INDEX IF NOT EXISTS idx_engineer_profiles_spa_auth_user_id ON engineer_profiles_spa (auth_user_id);

-- RLS policies: engineers can read/update their own profile
CREATE POLICY "Engineer reads own profile"
  ON engineer_profiles_spa FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Engineer updates own profile"
  ON engineer_profiles_spa FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Engineer-to-job match results
CREATE TABLE engineer_job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_profile_id UUID NOT NULL REFERENCES engineer_profiles_spa(id) ON DELETE CASCADE,
  scanned_job_id UUID NOT NULL REFERENCES scanned_jobs(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  dimension_scores JSONB NOT NULL,
  reasoning JSONB NOT NULL,
  highlight_quote TEXT,
  display_rank INTEGER,
  feedback TEXT CHECK (feedback IN ('not_a_fit', 'applied')),
  feedback_reason TEXT,
  feedback_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (engineer_profile_id, scanned_job_id)
);

-- Indexes
CREATE INDEX idx_engineer_job_matches_profile ON engineer_job_matches (engineer_profile_id);
CREATE INDEX idx_engineer_job_matches_job ON engineer_job_matches (scanned_job_id);
CREATE INDEX idx_engineer_job_matches_rank ON engineer_job_matches (engineer_profile_id, display_rank);

-- Updated_at trigger
CREATE TRIGGER set_engineer_job_matches_updated_at
  BEFORE UPDATE ON engineer_job_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE engineer_job_matches ENABLE ROW LEVEL SECURITY;

-- Engineers can read their own matches
CREATE POLICY "Engineer reads own job matches"
  ON engineer_job_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM engineer_profiles_spa
      WHERE engineer_profiles_spa.id = engineer_job_matches.engineer_profile_id
        AND engineer_profiles_spa.auth_user_id = auth.uid()
    )
  );

-- Engineers can update their own matches (for feedback)
CREATE POLICY "Engineer updates own job matches"
  ON engineer_job_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM engineer_profiles_spa
      WHERE engineer_profiles_spa.id = engineer_job_matches.engineer_profile_id
        AND engineer_profiles_spa.auth_user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins full access to engineer job matches"
  ON engineer_job_matches FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
