-- Allow questionnaire to be filled while crawl is still running.
-- The crawl pipeline checks this timestamp to know whether to
-- auto-trigger summary generation and match computation on completion.
ALTER TABLE engineer_profiles_spa
  ADD COLUMN IF NOT EXISTS questionnaire_completed_at TIMESTAMPTZ;
