-- Scanned jobs from job-jr (external job scanner)
CREATE TABLE scanned_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_domain TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT NOT NULL UNIQUE,
  job_board_source TEXT,
  location TEXT,
  date_posted TEXT,
  description TEXT,
  hubspot_link TEXT,
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scanned_jobs_domain ON scanned_jobs (company_domain);
CREATE INDEX idx_scanned_jobs_active ON scanned_jobs (is_active);
CREATE INDEX idx_scanned_jobs_url ON scanned_jobs (job_url);

-- Updated_at trigger (reuses existing function from 010_hiring_profiles.sql)
CREATE TRIGGER set_scanned_jobs_updated_at
  BEFORE UPDATE ON scanned_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE scanned_jobs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active jobs
CREATE POLICY "Authenticated reads active scanned jobs"
  ON scanned_jobs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins have full access
CREATE POLICY "Admins full access to scanned jobs"
  ON scanned_jobs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
