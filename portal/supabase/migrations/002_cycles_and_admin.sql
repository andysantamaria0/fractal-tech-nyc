-- Fractal Partners Portal — Phase 2 Schema Updates
-- Cycles workflow, admin tooling, and submission history

-- =============================================
-- 1. Expand profiles: add is_admin flag
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- =============================================
-- 2. Expand feature_submissions table
-- =============================================

-- Add new columns for sprint/cycles workflow
ALTER TABLE feature_submissions
  ADD COLUMN IF NOT EXISTS assigned_engineer_id UUID REFERENCES engineers(id),
  ADD COLUMN IF NOT EXISTS preferred_engineer_id UUID REFERENCES engineers(id),
  ADD COLUMN IF NOT EXISTS sprint_start_date DATE,
  ADD COLUMN IF NOT EXISTS sprint_end_date DATE,
  ADD COLUMN IF NOT EXISTS hours_budget INT,
  ADD COLUMN IF NOT EXISTS hours_logged INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_hiring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hiring_types TEXT[] DEFAULT '{}';

-- Drop the old hiring_status and status constraints, then update
ALTER TABLE feature_submissions DROP CONSTRAINT IF EXISTS feature_submissions_hiring_status_check;
ALTER TABLE feature_submissions DROP CONSTRAINT IF EXISTS feature_submissions_status_check;

-- Expand status lifecycle
ALTER TABLE feature_submissions
  ADD CONSTRAINT feature_submissions_status_check
  CHECK (status IN ('submitted','reviewing','posted','matched','in_progress','completed','cancelled'));

-- Update default status to 'submitted' (already the default, but re-confirm)
ALTER TABLE feature_submissions ALTER COLUMN status SET DEFAULT 'submitted';

-- Make hiring_status nullable (replaced by is_hiring + hiring_types)
ALTER TABLE feature_submissions ALTER COLUMN hiring_status DROP NOT NULL;

-- =============================================
-- 3. Create submission_history (audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES feature_submissions(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE submission_history ENABLE ROW LEVEL SECURITY;

-- Admins can read/write history
CREATE POLICY "Admins full access submission_history"
  ON submission_history
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Users can read history for their own submissions
CREATE POLICY "Users read own submission history"
  ON submission_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feature_submissions fs
      WHERE fs.id = submission_history.submission_id
      AND fs.user_id = auth.uid()
    )
  );

-- =============================================
-- 4. Admin RLS policies across all tables
-- =============================================

-- Admins can do everything on profiles
CREATE POLICY "Admins full access profiles"
  ON profiles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admins can do everything on feature_submissions
CREATE POLICY "Admins full access feature_submissions"
  ON feature_submissions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admins can do everything on engineers
CREATE POLICY "Admins full access engineers"
  ON engineers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admins can do everything on spotlight_content
CREATE POLICY "Admins full access spotlight_content"
  ON spotlight_content
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admins can do everything on weekly_highlights
CREATE POLICY "Admins full access weekly_highlights"
  ON weekly_highlights
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admins can do everything on cohort_settings
CREATE POLICY "Admins full access cohort_settings"
  ON cohort_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =============================================
-- 5. Index for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_feature_submissions_status ON feature_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feature_submissions_user_id ON feature_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_submissions_assigned_engineer ON feature_submissions(assigned_engineer_id);
CREATE INDEX IF NOT EXISTS idx_submission_history_submission_id ON submission_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
