-- Add cohort field to engineers (e.g. fa2025, sp2026, su2025)
ALTER TABLE engineers ADD COLUMN cohort TEXT;

-- Create engineer_interests table for companies to express interest
CREATE TABLE engineer_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(engineer_id, user_id)
);

ALTER TABLE engineer_interests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own interests
CREATE POLICY "Users can manage own interests" ON engineer_interests
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all interests
CREATE POLICY "Admins can read all interests" ON engineer_interests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
