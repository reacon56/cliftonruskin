
-- Add versioning fields to master_lia_templates
ALTER TABLE public.master_lia_templates
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS scope_summary text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.master_lia_templates(id);

-- Add scope_change_flag and active_lia_id to cases
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS scope_change_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope_change_resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_lia_id uuid REFERENCES public.master_lia_templates(id);
