-- Add resume_url to engineers table
ALTER TABLE engineers ADD COLUMN IF NOT EXISTS resume_url TEXT;
