
-- Add new fields for internal case management
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_type text NOT NULL DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS report_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS qa_owner uuid NULL,
  ADD COLUMN IF NOT EXISTS internal_notes text NULL,
  ADD COLUMN IF NOT EXISTS structured_source_log jsonb NULL DEFAULT '[]'::jsonb;
