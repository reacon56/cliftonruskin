
-- AI output log for versioned storage with guardrail metadata
CREATE TABLE public.ai_output_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  function_name text NOT NULL,
  model_used text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  raw_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  sanitised_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  guardrail_violations_found integer NOT NULL DEFAULT 0,
  guardrail_replacements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_disclaimer text NOT NULL DEFAULT 'AI-assisted drafting used. Human review completed.',
  human_reviewed boolean NOT NULL DEFAULT false,
  human_reviewed_by uuid REFERENCES auth.users(id),
  human_reviewed_at timestamptz,
  report_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.ai_output_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage ai output log"
  ON public.ai_output_log FOR ALL
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));

CREATE POLICY "Users see own org ai output log"
  ON public.ai_output_log FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()));

CREATE INDEX idx_ai_output_log_case ON public.ai_output_log(case_id);
