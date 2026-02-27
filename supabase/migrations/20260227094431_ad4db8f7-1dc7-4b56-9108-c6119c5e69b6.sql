
-- Report amendments table for version control
CREATE TABLE public.report_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_draft_id uuid NOT NULL REFERENCES public.report_drafts(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  prior_version integer NOT NULL,
  new_version integer NOT NULL,
  amendment_reason text NOT NULL,
  amended_sections text[] NOT NULL DEFAULT '{}',
  change_log text,
  prior_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  amended_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  client_notified boolean NOT NULL DEFAULT false,
  client_notified_at timestamptz
);

-- RLS
ALTER TABLE public.report_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage report amendments"
  ON public.report_amendments FOR ALL
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));

CREATE POLICY "Users see own org report amendments"
  ON public.report_amendments FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()));

-- Index
CREATE INDEX idx_report_amendments_draft ON public.report_amendments(report_draft_id);
CREATE INDEX idx_report_amendments_case ON public.report_amendments(case_id);
