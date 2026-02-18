-- Cycles response form: companies fill this out after receiving a pitch email
CREATE TABLE cycles_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  interested_engineers TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anonymous inserts (form is public, no auth required)
ALTER TABLE cycles_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cycles responses"
  ON cycles_responses FOR INSERT
  WITH CHECK (true);

-- Only admins can read responses (via service role)
CREATE POLICY "Service role can read cycles responses"
  ON cycles_responses FOR SELECT
  USING (auth.role() = 'service_role');
