-- Add 'embed' to spotlight_content content_type constraint
ALTER TABLE spotlight_content DROP CONSTRAINT IF EXISTS spotlight_content_content_type_check;
ALTER TABLE spotlight_content ADD CONSTRAINT spotlight_content_content_type_check
  CHECK (content_type IN ('video','text','image','embed'));
