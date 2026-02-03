-- Auto-onboarding: enable self-service company onboarding with role discovery

-- 1. Expand hiring_profiles status to include 'discovering_roles'
ALTER TABLE hiring_profiles
  DROP CONSTRAINT IF EXISTS hiring_profiles_status_check;

ALTER TABLE hiring_profiles
  ADD CONSTRAINT hiring_profiles_status_check
  CHECK (status IN ('draft', 'crawling', 'discovering_roles', 'questionnaire', 'complete'));

-- 2. Add discovered_roles column for storing auto-found role listings
ALTER TABLE hiring_profiles
  ADD COLUMN IF NOT EXISTS discovered_roles JSONB;

-- 3. Allow companies to insert their own hiring profile (needed for auto-onboard API)
CREATE POLICY "Company inserts own hiring profile"
  ON hiring_profiles FOR INSERT
  WITH CHECK (auth.uid() = company_id);
