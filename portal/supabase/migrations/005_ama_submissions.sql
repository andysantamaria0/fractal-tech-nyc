-- AMA Submissions (public form, no auth required)
CREATE TABLE ama_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  twitter TEXT NOT NULL,
  phone TEXT NOT NULL,
  context TEXT NOT NULL,
  question TEXT NOT NULL,
  tag_preference TEXT NOT NULL CHECK (tag_preference IN ('tag-me', 'keep-anon')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only service role can insert/read
ALTER TABLE ama_submissions ENABLE ROW LEVEL SECURITY;
