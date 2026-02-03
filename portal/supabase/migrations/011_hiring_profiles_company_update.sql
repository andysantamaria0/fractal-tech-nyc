-- Allow companies to update their own hiring profile (save questionnaire answers)
CREATE POLICY "Company updates own hiring profile"
  ON hiring_profiles FOR UPDATE
  USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);
