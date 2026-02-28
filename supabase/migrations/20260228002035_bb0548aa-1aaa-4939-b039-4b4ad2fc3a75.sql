
-- Narrative templates for exec summary generation
CREATE TABLE public.narrative_template (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  audience TEXT NOT NULL DEFAULT 'CLIENT',
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.narrative_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read narrative templates"
  ON public.narrative_template FOR SELECT TO authenticated USING (true);

CREATE POLICY "Internal admins can manage narrative templates"
  ON public.narrative_template FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Report sections linked to case/report version
CREATE TABLE public.report_section (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  report_version INT NOT NULL DEFAULT 1,
  section_key TEXT NOT NULL DEFAULT 'exec_summary',
  content_text TEXT NOT NULL DEFAULT '',
  generated_by TEXT DEFAULT 'ai',
  edited_by UUID,
  edited_at TIMESTAMPTZ,
  finalized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, report_version, section_key)
);

ALTER TABLE public.report_section ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage report sections"
  ON public.report_section FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Seed a default executive summary template
INSERT INTO public.narrative_template (template_key, audience, content_markdown) VALUES
  ('exec_summary_default', 'CLIENT', E'Generate a 120-180 word executive summary in British assurance firm tone.\n\nCover: entity identity, jurisdiction exposure, risk band with key contributing factors, recommended controls.\nCite indicator effective dates and retrieval dates naturally.\nDo not use technical jargon. Do not provide legal advice.\nEnd with a forward-looking statement about monitoring.');
