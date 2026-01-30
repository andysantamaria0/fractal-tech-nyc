-- Fractal Partners Portal — Initial Schema
-- Run against Supabase PostgreSQL

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company_linkedin TEXT NOT NULL,
  company_stage TEXT NOT NULL CHECK (company_stage IN ('bootstrapped','angel','pre-seed','seed','bigger')),
  newsletter_optin BOOLEAN DEFAULT false,
  hubspot_company_id TEXT,
  hubspot_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engineers
CREATE TABLE engineers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  github_url TEXT NOT NULL,
  github_username TEXT,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  what_excites_you TEXT,
  availability_start DATE,
  availability_hours_per_week INT,
  availability_duration_weeks INT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  is_available_for_cycles BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Submissions
CREATE TABLE feature_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  engineer_id UUID REFERENCES engineers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  timeline TEXT NOT NULL CHECK (timeline IN ('no-rush','2-weeks','1-month','urgent')),
  tech_stack TEXT,
  hiring_status TEXT NOT NULL CHECK (hiring_status IN ('contract','interns','both','interested','no')),
  hubspot_note_id TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','matched','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spotlight Content (CMS)
CREATE TABLE spotlight_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video','text','image')),
  content_url TEXT,
  content_body TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Highlights (CMS)
CREATE TABLE weekly_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  cohort_start_date DATE NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohort Settings
CREATE TABLE cohort_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  duration_weeks INT DEFAULT 12,
  num_engineers INT DEFAULT 0,
  break_week INT,
  is_active BOOLEAN DEFAULT true
);

-- ======================
-- Row Level Security
-- ======================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Feature Submissions
ALTER TABLE feature_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own submissions" ON feature_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own submissions" ON feature_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Engineers (public read for available engineers)
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read engineers" ON engineers FOR SELECT USING (is_available_for_cycles = true);

-- Spotlight Content (public read for active items)
ALTER TABLE spotlight_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read spotlights" ON spotlight_content FOR SELECT USING (is_active = true);

-- Weekly Highlights (authenticated read)
ALTER TABLE weekly_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read highlights" ON weekly_highlights FOR SELECT TO authenticated USING (true);

-- Cohort Settings (authenticated read for active cohort)
ALTER TABLE cohort_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cohort" ON cohort_settings FOR SELECT TO authenticated USING (is_active = true);
