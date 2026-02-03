-- Allow engineers to be created without a GitHub URL
ALTER TABLE engineers ALTER COLUMN github_url DROP NOT NULL;
