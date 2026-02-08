-- Tracks when a user initiates login from the engineer portal.
-- Survives across browsers/devices (unlike cookies or query params).
-- The callback checks this table to route users to engineer onboard.
CREATE TABLE engineer_login_intents (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS — accessed via service role client only
ALTER TABLE engineer_login_intents ENABLE ROW LEVEL SECURITY;
