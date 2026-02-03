-- Hiring roles table for storing job descriptions and beautified JDs
CREATE TABLE hiring_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_profile_id UUID NOT NULL REFERENCES hiring_profiles(id) ON DELETE CASCADE,
  source_url TEXT,
  source_content TEXT,
  title TEXT NOT NULL,
  beautified_jd JSONB,
  dimension_weights JSONB NOT NULL DEFAULT '{"technical_skills": 20, "culture_fit": 20, "experience_level": 20, "growth_potential": 20, "collaboration": 20}',
  challenge_enabled BOOLEAN NOT NULL DEFAULT false,
  challenge_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'beautifying', 'active', 'paused', 'closed')),
  public_slug UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hiring_roles_hiring_profile_id ON hiring_roles (hiring_profile_id);
CREATE INDEX idx_hiring_roles_status ON hiring_roles (status);
CREATE UNIQUE INDEX idx_hiring_roles_public_slug ON hiring_roles (public_slug);

-- Updated_at trigger (reuses existing function from 010_hiring_profiles.sql)
CREATE TRIGGER set_hiring_roles_updated_at
  BEFORE UPDATE ON hiring_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE hiring_roles ENABLE ROW LEVEL SECURITY;

-- Company can read their own roles (via hiring_profile join)
CREATE POLICY "Company reads own roles"
  ON hiring_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_profiles
      WHERE hiring_profiles.id = hiring_roles.hiring_profile_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Company can insert their own roles
CREATE POLICY "Company inserts own roles"
  ON hiring_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hiring_profiles
      WHERE hiring_profiles.id = hiring_roles.hiring_profile_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Company can update their own roles
CREATE POLICY "Company updates own roles"
  ON hiring_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hiring_profiles
      WHERE hiring_profiles.id = hiring_roles.hiring_profile_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Company can delete their own roles
CREATE POLICY "Company deletes own roles"
  ON hiring_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hiring_profiles
      WHERE hiring_profiles.id = hiring_roles.hiring_profile_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins full access to hiring roles"
  ON hiring_roles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public can read active roles (for /jd/[slug] page)
CREATE POLICY "Public reads active roles"
  ON hiring_roles FOR SELECT
  USING (status = 'active');

-- JD page views table (tracks email-gated views)
CREATE TABLE jd_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES hiring_roles(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jd_page_views_role_id ON jd_page_views (role_id);

-- RLS for jd_page_views
-- Inserts go through service client (unauthenticated viewers)
-- Companies can read views for their roles
ALTER TABLE jd_page_views ENABLE ROW LEVEL SECURITY;

-- Company can read views on their roles
CREATE POLICY "Company reads own role views"
  ON jd_page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hiring_roles
      JOIN hiring_profiles ON hiring_profiles.id = hiring_roles.hiring_profile_id
      WHERE hiring_roles.id = jd_page_views.role_id
        AND hiring_profiles.company_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins full access to jd page views"
  ON jd_page_views FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
