-- Add company_name column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Backfill from company_linkedin: extract slug after /company/ and title-case it
UPDATE profiles
SET company_name = initcap(
  replace(
    split_part(
      split_part(company_linkedin, '/company/', 2),
      '/', 1
    ),
    '-', ' '
  )
)
WHERE company_name IS NULL
  AND company_linkedin IS NOT NULL
  AND company_linkedin LIKE '%/company/%';
