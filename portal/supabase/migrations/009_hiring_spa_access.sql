-- Add hiring spa access and website fields to profiles
ALTER TABLE profiles ADD COLUMN has_hiring_spa_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN website_url TEXT;
ALTER TABLE profiles ADD COLUMN github_org TEXT;

-- Partial index for efficient lookups of companies with hiring spa access
CREATE INDEX idx_profiles_hiring_spa_access ON profiles (id) WHERE has_hiring_spa_access = true;
