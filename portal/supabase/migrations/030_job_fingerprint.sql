-- Add fingerprint column for deduplication
ALTER TABLE scanned_jobs
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_scanned_jobs_fingerprint ON scanned_jobs (fingerprint);

-- Backfill fingerprints for existing jobs
-- Fingerprint = domain::normalized_title::location
UPDATE scanned_jobs
SET fingerprint = CONCAT(
  LOWER(REGEXP_REPLACE(company_domain, '^www\.', '')),
  '::',
  LOWER(TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(job_title, '\s*(sr\.?|senior|jr\.?|junior|lead|staff|principal|intern)\s*', ' ', 'gi'),
    '\s+', ' ', 'g'
  ))),
  '::',
  COALESCE(LOWER(TRIM(location)), '')
)
WHERE fingerprint IS NULL;
