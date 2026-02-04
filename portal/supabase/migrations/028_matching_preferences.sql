-- Add matching preferences (filter rules) to engineer profiles
ALTER TABLE engineer_profiles_spa ADD COLUMN IF NOT EXISTS matching_preferences JSONB DEFAULT '{}';

-- Add feedback category to engineer job matches
ALTER TABLE engineer_job_matches ADD COLUMN IF NOT EXISTS feedback_category TEXT;
