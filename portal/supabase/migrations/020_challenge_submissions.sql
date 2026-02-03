-- Challenge submissions table
CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES hiring_spa_matches(id) ON DELETE CASCADE,

  -- Submission content
  text_response TEXT,
  link_url TEXT,
  file_url TEXT,
  file_name TEXT,

  -- Auto-grade (LLM)
  auto_score INTEGER CHECK (auto_score IS NULL OR (auto_score >= 0 AND auto_score <= 100)),
  auto_reasoning TEXT,
  auto_graded_at TIMESTAMPTZ,

  -- Human review (Engineering Leader)
  reviewer_name TEXT,
  reviewer_linkedin_url TEXT,
  human_score INTEGER CHECK (human_score IS NULL OR (human_score >= 0 AND human_score <= 100)),
  human_feedback TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Computed final score
  final_score INTEGER CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)),

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_challenge_submissions_match_id ON challenge_submissions (match_id);

CREATE TRIGGER set_challenge_submissions_updated_at
  BEFORE UPDATE ON challenge_submissions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to challenge submissions"
  ON challenge_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Company reads challenge submissions for own roles"
  ON challenge_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_spa_matches
      JOIN hiring_roles ON hiring_roles.id = hiring_spa_matches.role_id
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_spa_matches.id = challenge_submissions.match_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-submissions', 'challenge-submissions', true)
ON CONFLICT (id) DO NOTHING;
