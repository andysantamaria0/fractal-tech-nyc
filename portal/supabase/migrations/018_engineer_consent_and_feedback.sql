-- Engineer consent fields on matches
ALTER TABLE hiring_spa_matches
  ADD COLUMN engineer_notified_at TIMESTAMPTZ,
  ADD COLUMN engineer_decision TEXT CHECK (engineer_decision IN ('interested', 'not_interested')),
  ADD COLUMN engineer_decision_at TIMESTAMPTZ;

-- Match quality feedback table
CREATE TABLE match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES hiring_spa_matches(id) ON DELETE CASCADE UNIQUE,
  hired BOOLEAN NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  worked_well TEXT,
  didnt_work TEXT,
  would_use_again BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_feedback_match_id ON match_feedback (match_id);

-- RLS
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company manages own match feedback" ON match_feedback
  FOR ALL USING (
    match_id IN (
      SELECT hsm.id FROM hiring_spa_matches hsm
      JOIN hiring_roles hr ON hsm.role_id = hr.id
      JOIN hiring_profiles hp ON hr.hiring_profile_id = hp.id
      WHERE hp.company_id = auth.uid()
    )
  );

CREATE POLICY "Admin full access to match feedback" ON match_feedback
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Updated_at trigger
CREATE TRIGGER set_match_feedback_updated_at
  BEFORE UPDATE ON match_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
