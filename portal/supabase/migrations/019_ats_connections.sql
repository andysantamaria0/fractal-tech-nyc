-- ATS connections table for storing API keys and sync metadata
CREATE TABLE ats_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('greenhouse')),
  api_key TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  last_sync_role_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, provider)
);

ALTER TABLE ats_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ats_connections" ON ats_connections
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE TRIGGER set_ats_connections_updated_at
  BEFORE UPDATE ON ats_connections FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ATS tracking columns on hiring_roles
ALTER TABLE hiring_roles
  ADD COLUMN IF NOT EXISTS ats_provider TEXT,
  ADD COLUMN IF NOT EXISTS ats_external_id TEXT,
  ADD COLUMN IF NOT EXISTS ats_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_hiring_roles_ats_external
  ON hiring_roles (hiring_profile_id, ats_provider, ats_external_id)
  WHERE ats_external_id IS NOT NULL;
