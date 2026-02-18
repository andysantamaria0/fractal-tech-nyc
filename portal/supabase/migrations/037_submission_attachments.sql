-- Add company_name and attachment_urls to feature_submissions
ALTER TABLE feature_submissions
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

-- Storage bucket for submission attachments
-- Run manually: INSERT INTO storage.buckets (id, name, public) VALUES ('submission-attachments', 'submission-attachments', false);

-- Authenticated users can upload attachments
CREATE POLICY "Authenticated upload submission attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submission-attachments');

-- Users can read their own uploads (path starts with their user id)
CREATE POLICY "Users read own submission attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submission-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all submission attachments
CREATE POLICY "Admins read all submission attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submission-attachments'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admins can delete submission attachments
CREATE POLICY "Admins delete submission attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'submission-attachments'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
