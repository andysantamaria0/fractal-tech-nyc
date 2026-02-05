-- Add preferred_locations column to engineer_profiles_spa
ALTER TABLE engineer_profiles_spa
ADD COLUMN IF NOT EXISTS preferred_locations text[];
