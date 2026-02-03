-- Engineer profiles for the hiring SPA matching pipeline
CREATE TABLE engineer_profiles_spa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID REFERENCES engineers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin_url TEXT,
  resume_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  crawl_data JSONB,
  crawl_error TEXT,
  crawl_completed_at TIMESTAMPTZ,
  engineer_dna JSONB,
  work_preferences JSONB,
  career_growth JSONB,
  strengths JSONB,
  growth_areas JSONB,
  deal_breakers JSONB,
  profile_summary JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'crawling', 'questionnaire', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_engineer_profiles_spa_engineer_id ON engineer_profiles_spa (engineer_id);
CREATE INDEX idx_engineer_profiles_spa_status ON engineer_profiles_spa (status);
CREATE INDEX idx_engineer_profiles_spa_email ON engineer_profiles_spa (email);

-- Updated_at trigger (reuses existing function from 010_hiring_profiles.sql)
CREATE TRIGGER set_engineer_profiles_spa_updated_at
  BEFORE UPDATE ON engineer_profiles_spa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only (engineers are Fractal-sourced, not self-service)
ALTER TABLE engineer_profiles_spa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to engineer profiles spa"
  ON engineer_profiles_spa FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
