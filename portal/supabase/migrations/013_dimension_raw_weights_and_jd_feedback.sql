-- Add raw slider weights (1-10 per dimension) and JD feedback storage
ALTER TABLE hiring_roles
  ADD COLUMN IF NOT EXISTS dimension_weights_raw JSONB,
  ADD COLUMN IF NOT EXISTS jd_feedback JSONB;

COMMENT ON COLUMN hiring_roles.dimension_weights_raw IS 'Raw 1-10 slider values per dimension before normalization to percentages';
COMMENT ON COLUMN hiring_roles.jd_feedback IS 'User feedback on beautified JD requirements and prose sections';
