
-- Enum for report approval status
CREATE TYPE public.report_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Enum for report workflow status
CREATE TYPE public.report_workflow_status AS ENUM ('draft', 'in_review', 'approved', 'issued');

-- Report approval table
CREATE TABLE public.report_approval (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_draft_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id),
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  report_version INT NOT NULL DEFAULT 1,
  requested_by UUID NOT NULL,
  reviewer_user_id UUID,
  status report_approval_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- Add report_status column to report_drafts
ALTER TABLE public.report_drafts
  ADD COLUMN IF NOT EXISTS report_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_user_id UUID;

-- RLS
ALTER TABLE public.report_approval ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view report approvals"
  ON public.report_approval FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()) OR org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Internal users can insert report approvals"
  ON public.report_approval FOR INSERT TO authenticated
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "Internal users can update report approvals"
  ON public.report_approval FOR UPDATE TO authenticated
  USING (public.is_internal(auth.uid()));

-- Indexes
CREATE INDEX idx_report_approval_case ON public.report_approval(case_id);
CREATE INDEX idx_report_approval_draft ON public.report_approval(report_draft_id);
CREATE INDEX idx_report_approval_status ON public.report_approval(status);
