-- Backfill questionnaire_completed_at for engineers who completed the questionnaire
-- but were missing the timestamp due to a bug in the non-crawl submission paths.
UPDATE engineers
SET questionnaire_completed_at = now()
WHERE status = 'complete'
  AND questionnaire_completed_at IS NULL;
