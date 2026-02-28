
-- Report status enum
CREATE TYPE public.report_status AS ENUM ('DRAFT', 'ISSUED');

-- Section key enum
CREATE TYPE public.report_section_key AS ENUM ('EXEC_SUMMARY', 'JURISDICTION_ANNEX', 'METHODOLOGY_NOTE');

-- Report master record
CREATE TABLE public.report (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status public.report_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at TIMESTAMPTZ,
  UNIQUE (case_id)
);

ALTER TABLE public.report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage reports"
  ON public.report FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Report versions
CREATE TABLE public.report_version (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.report(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  content_hash TEXT,
  UNIQUE (report_id, version_number)
);

ALTER TABLE public.report_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage report versions"
  ON public.report_version FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Migrate report_section: add report_version_id, keep backward compat
ALTER TABLE public.report_section
  ADD COLUMN IF NOT EXISTS report_version_id UUID REFERENCES public.report_version(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_json JSONB DEFAULT '{}'::jsonb;

-- Drop the old unique constraint and add a new one with report_version_id
ALTER TABLE public.report_section DROP CONSTRAINT IF EXISTS report_section_case_id_report_version_section_key_key;

-- Rename content_text to content_markdown for consistency
ALTER TABLE public.report_section RENAME COLUMN content_text TO content_markdown;
