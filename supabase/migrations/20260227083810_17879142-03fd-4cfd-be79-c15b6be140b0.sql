
-- Report Drafts: structured report object with 4 sections
CREATE TABLE public.report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,

  -- Section 1: Structured data (auto-filled JSON)
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  structured_data_locked boolean NOT NULL DEFAULT false,
  structured_data_locked_at timestamptz,
  structured_data_locked_by uuid,

  -- Section 2: Officer commentary (manual)
  officer_commentary jsonb NOT NULL DEFAULT '{}'::jsonb,
  officer_commentary_complete boolean NOT NULL DEFAULT false,

  -- Section 3: AI draft (generated, editable)
  ai_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_draft_reviewed boolean NOT NULL DEFAULT false,
  ai_draft_dismissed boolean NOT NULL DEFAULT false,

  -- Section 4: QA
  qa_comments text,
  qa_approval_status text NOT NULL DEFAULT 'pending',
  qa_approved_by uuid,
  qa_approved_at timestamptz,

  -- Versioning
  report_version integer NOT NULL DEFAULT 1,
  amendment_history jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- PDF generation tracking
  pdf_generated boolean NOT NULL DEFAULT false,
  pdf_generated_at timestamptz,
  pdf_deliverable_id uuid REFERENCES public.deliverables(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;

-- Internal full access
CREATE POLICY "Internal manage report drafts"
ON public.report_drafts FOR ALL TO authenticated
USING (is_internal(auth.uid()))
WITH CHECK (is_internal(auth.uid()));

-- Clients can read report drafts for their org (released reports only visible via deliverables)
CREATE POLICY "Clients read own org report drafts"
ON public.report_drafts FOR SELECT TO authenticated
USING (
  NOT is_internal(auth.uid())
  AND org_id = get_user_org_id(auth.uid())
  AND qa_approval_status = 'approved'
);

-- Unique: one draft per case
CREATE UNIQUE INDEX report_drafts_case_id_unique ON public.report_drafts(case_id);
