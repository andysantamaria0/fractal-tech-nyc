-- Phase 2b: Challenge response tracking on matches

ALTER TABLE hiring_spa_matches
  ADD COLUMN challenge_response TEXT CHECK (challenge_response IN ('accepted', 'declined')),
  ADD COLUMN challenge_response_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_hiring_spa_matches_role_engineer
  ON hiring_spa_matches (role_id, engineer_id);
