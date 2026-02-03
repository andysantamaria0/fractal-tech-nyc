-- Fix: Add website_url and github_org columns that were missing from production
-- (migration 009 was partially applied)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_org TEXT;

-- Ensure the partial index exists
CREATE INDEX IF NOT EXISTS idx_profiles_hiring_spa_access ON profiles (id) WHERE has_hiring_spa_access = true;
