-- Fix adhoc_matches: RLS was wide open (USING true), needs admin-only check.
-- Also add missing updated_at trigger.

-- ============================================================
-- 1. Replace wide-open RLS policy with admin-only
-- ============================================================

DROP POLICY IF EXISTS "Admin full access to adhoc_matches" ON adhoc_matches;

CREATE POLICY "Admin full access to adhoc_matches"
  ON adhoc_matches
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- 2. Add updated_at trigger (was missing from 033)
-- ============================================================

CREATE TRIGGER set_adhoc_matches_updated_at
  BEFORE UPDATE ON adhoc_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
