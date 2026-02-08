-- Ad-hoc JD matching: stores results when an admin pastes a JD URL
-- and scores it against selected engineers outside the normal pipeline.

CREATE TABLE IF NOT EXISTS adhoc_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jd_url TEXT NOT NULL,
  jd_title TEXT NOT NULL,
  jd_raw_text TEXT,
  jd_sections JSONB,
  source_platform TEXT,
  engineer_id UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  admin_user_id UUID,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  dimension_scores JSONB NOT NULL,
  reasoning JSONB NOT NULL,
  highlight_quote TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_adhoc_matches_engineer_id ON adhoc_matches(engineer_id);
CREATE INDEX IF NOT EXISTS idx_adhoc_matches_jd_url ON adhoc_matches(jd_url);
CREATE INDEX IF NOT EXISTS idx_adhoc_matches_created_at ON adhoc_matches(created_at DESC);

-- ============================================================
-- RLS: admin-only access
-- ============================================================

ALTER TABLE adhoc_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to adhoc_matches"
  ON adhoc_matches
  FOR ALL
  USING (true)
  WITH CHECK (true);
