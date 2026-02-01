-- Allow admin/team profiles without company info
ALTER TABLE profiles ALTER COLUMN company_linkedin DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN company_stage DROP NOT NULL;
