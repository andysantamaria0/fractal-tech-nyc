-- Hiring profiles table for storing crawl data and synthesis results
CREATE TABLE hiring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  crawl_data JSONB,
  crawl_error TEXT,
  crawl_completed_at TIMESTAMPTZ,
  company_dna JSONB,
  technical_environment JSONB,
  contradictions JSONB,
  culture_answers JSONB,
  mission_answers JSONB,
  team_dynamics_answers JSONB,
  profile_summary JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'crawling', 'questionnaire', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hiring_profiles_company_id ON hiring_profiles (company_id);
CREATE INDEX idx_hiring_profiles_status ON hiring_profiles (status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_hiring_profiles_updated_at
  BEFORE UPDATE ON hiring_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE hiring_profiles ENABLE ROW LEVEL SECURITY;

-- Company can read their own hiring profile
CREATE POLICY "Company reads own hiring profile"
  ON hiring_profiles FOR SELECT
  USING (auth.uid() = company_id);

-- Admins have full access
CREATE POLICY "Admins full access to hiring profiles"
  ON hiring_profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
